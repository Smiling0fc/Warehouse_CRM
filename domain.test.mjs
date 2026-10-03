import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from './seed.js';
import { receive, movePlace, addExpense, metrics, payroll, range, trend, csvCell } from './domain.js';
import { DemoRepository, HttpRepository } from './repository.js';
const filters={direction:'all',period:'today'};
test('Приёмка: фактическое количество, остаток, грузовое место и начисление согласованы',()=>{
 const s=createSeed(),before=metrics(s,filters),product=s.products.find(p=>p.id==='p7');
 const next=receive(s,{id:'IN-1048',quantity:400,employeeId:'e17'});
 assert.equal(next.products.find(p=>p.id==='p7').onHand,product.onHand+400);
 assert.equal(next.receipts[0].status,'discrepancy');assert.equal(next.places.at(-1).quantity,400);
 assert.equal(metrics(next,filters).payroll,before.payroll+800);
 assert.equal(metrics(next,filters).operations,before.operations+400);
 assert.equal(s.receipts[0].status,'waiting');
 assert.deepEqual(receive(next,{id:'IN-1048',quantity:400,employeeId:'e17'}),next);
});
test('Приёмка отклоняет неверное количество и сотрудника чужого направления',()=>{
 const s=createSeed();for(const quantity of [0,-1,1.5,100001,NaN])assert.throws(()=>receive(s,{id:'IN-1048',quantity,employeeId:'e17'}));
 assert.throws(()=>receive(s,{id:'IN-1048',quantity:10,employeeId:'e1'}));
});
test('Финансы: расход уменьшает результат один раз, долги не списываются в расходы',()=>{
 const s=createSeed(),before=metrics(s,filters),payload={id:'test-cost',amount:1234.5,category:'Упаковка',direction:'ff',description:'Тест'};
 const next=addExpense(s,payload);assert.equal(metrics(next,filters).expenses,before.expenses+1234.5);
 assert.equal(metrics(next,filters).profit,before.profit-1234.5);assert.deepEqual(next.debts,s.debts);
 assert.deepEqual(addExpense(next,payload),next);
});
test('Перемещение сохраняет состав и историю без изменения товарного остатка',()=>{
 const s=createSeed(),next=movePlace(s,{id:'GM-1040',location:'A-12-02'});
 assert.equal(next.places[0].location,'A-12-02');assert.equal(next.places[0].history.length,2);
 assert.deepEqual(next.products,s.products);assert.equal(next.places[0].quantity,s.places[0].quantity);
});
test('Направления складываются в общий результат, зарплата равна сумме сотрудников',()=>{
 const s=createSeed(),m=metrics(s,filters);
 for(const key of ['revenue','expenses','profit','payroll','operations'])assert.equal(['steel','own','ff'].reduce((n,direction)=>n+metrics(s,{...filters,direction})[key],0),m[key]);
 assert.equal(payroll(s,filters).reduce((n,p)=>n+p.total,0),m.payroll);
 assert.deepEqual(range('week'),{start:'2026-09-27',end:'2026-10-03'});
 assert.deepEqual(range('week',true),{start:'2026-09-20',end:'2026-09-26'});
});
test('Тренды и CSV корректно обрабатывают нулевую базу и формулы',()=>{
 assert.equal(trend(1,0).text,'Нет базы сравнения');assert.equal(trend(100,100).tone,'neutral');assert.equal(trend(120,100,false).tone,'negative');
 assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('a"b'),'"a""b"');
});
test('DemoRepository сохраняет и восстанавливает данные',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const repo=new DemoRepository(storage);await repo.command('receive',{id:'IN-1048',quantity:420,employeeId:'e17'});
 assert.equal((await new DemoRepository(storage).snapshot()).receipts[0].status,'accepted');
 await repo.reset();assert.equal((await repo.snapshot()).receipts[0].status,'waiting');
});
test('HTTP adapter uses API contract and idempotency, no frontend secrets',async()=>{
 const old=globalThis.fetch;let captured;
 globalThis.fetch=async(url,options)=>{captured={url,options};return {ok:true,json:async()=>createSeed()};};
 try{const repo=new HttpRepository('/api/v1/');await repo.command('receive',{requestId:'receive-IN-1048'});assert.equal(captured.url,'/api/v1/commands/receive');assert.equal(captured.options.credentials,'include');assert.equal(captured.options.headers['Idempotency-Key'],'receive-IN-1048');}finally{globalThis.fetch=old;}
});
