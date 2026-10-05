import { DEMO_DATE } from './seed.js';
export const sum=(rows,key='amount')=>rows.reduce((v,x)=>v+Number(x[key]||0),0);
export function range(period='today',previous=false) {
  const n=({today:1,week:7,month:30,year:365})[period]||1, end=new Date(DEMO_DATE+'T00:00:00Z');
  if(previous)end.setUTCDate(end.getUTCDate()-n);
  const start=new Date(end);start.setUTCDate(start.getUTCDate()-n+1);
  return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
export function matches(row,direction){return direction==='all'||row.direction===direction;}
export function periodRows(rows,filters,previous=false){const r=range(filters.period,previous);return rows.filter(x=>matches(x,filters.direction)&&x.date>=r.start&&x.date<=r.end);}
export function payroll(state,filters,previous=false) {
  const ops=periodRows(state.operations,filters,previous).filter(x=>x.confirmed),r=range(filters.period,previous);
  return state.employees.filter(e=>matches(e,filters.direction)).map(e=>{
    const shifts=state.shifts.filter(s=>s.employeeId===e.id&&s.date>=r.start&&s.date<=r.end),rows=ops.filter(o=>o.employeeId===e.id);
    const base=sum(shifts,'basePay'),piece=sum(rows),quantity=sum(rows,'quantity'),hours=sum(shifts,'hours');
    return {...e,base,piece,total:base+piece,quantity,hours,productivity:hours?quantity/hours:0,rows};
  });
}
export function metrics(state,filters,previous=false) {
 const rows=periodRows(state.finance,filters,previous),pay=sum(payroll(state,filters,previous),'total');
 const revenue=sum(rows.filter(x=>x.kind==='revenue')),expenses=sum(rows.filter(x=>x.kind==='expense'))+pay;
 return {revenue,expenses,payroll:pay,profit:revenue-expenses,operations:sum(periodRows(state.operations,filters,previous).filter(x=>x.confirmed),'quantity')};
}
export function trend(current,previous,goodWhenUp=true){
 const percent=previous?((current-previous)/Math.abs(previous))*100:null;
 const stable=percent!==null&&Math.abs(percent)<1;
 return {text:percent===null?'Нет базы сравнения':stable?'→ Стабильно':`${percent>0?'↑':'↓'} ${Math.abs(percent).toFixed(1).replace('.',',')}%`,tone:stable||percent===null?'neutral':(percent>0)===goodWhenUp?'positive':'negative'};
}
function assert(v,message){if(!v)throw new Error(message);}
export function receive(state,payload){
 const {id,quantity,employeeId}=payload,receipt=state.receipts.find(x=>x.id===id);
 assert(receipt,'Поступление не найдено');
 if(receipt.status==='accepted'||receipt.status==='discrepancy')return state;
 assert(Number.isInteger(quantity)&&quantity>0&&quantity<=100000,'Введите целое количество от 1 до 100 000');
 const employee=state.employees.find(e=>e.id===employeeId&&e.direction===receipt.direction);
 assert(employee,'Выберите сотрудника этого направления');
 const next=structuredClone(state),r=next.receipts.find(x=>x.id===id),p=next.products.find(x=>x.id===r.productId),rate=r.direction==='steel'?4:2;
 r.status=quantity===r.expected?'accepted':'discrepancy';r.actual=quantity;r.employeeId=employeeId;
 p.onHand+=quantity;
 next.operations.push({id:`receive-${id}`,date:DEMO_DATE,employeeId,direction:r.direction,type:'receive',quantity,rate,amount:quantity*rate,reference:id,confirmed:true});
 next.places.push({id:`GM-${id}`,direction:r.direction,owner:r.owner,productId:p.id,quantity,location:'Зона приёмки',status:'awaiting-placement',history:[{at:new Date().toISOString(),text:`Принято ${quantity} шт. по ${id}`,actor:employee.name}]});
 next.audit.unshift({at:new Date().toISOString(),text:`${id}: принято ${quantity} шт.`,actor:employee.name});
 return next;
}
export function movePlace(state,{id,location}){
 const clean=String(location||'').trim();assert(clean.length>=2&&clean.length<=40,'Укажите адрес ячейки: от 2 до 40 символов');
 const next=structuredClone(state),p=next.places.find(x=>x.id===id);assert(p,'Грузовое место не найдено');
 assert(clean!==p.location,'Место уже находится в этой ячейке');
 const at=new Date().toISOString(),text=`${p.location} → ${clean}`;
 p.history.push({at,text,actor:'Демо-управляющий'});p.location=clean;p.status='stored';
 next.audit.unshift({at,text:`${id}: ${text}`,actor:'Демо-управляющий'});return next;
}
export function addExpense(state,{amount,category,direction,description,id}){
 assert(Number.isFinite(amount)&&amount>0&&amount<=100000000,'Сумма должна быть от 0,01 до 100 000 000 ₽');
 assert(['steel','own','ff'].includes(direction),'Выберите направление');
 assert(['Аренда','Коммунальные услуги','Упаковка','Оборудование','Логистика','Прочее'].includes(category),'Выберите статью');
 assert(String(description||'').trim().length>0&&description.length<=200,'Укажите основание до 200 символов');
 const next=structuredClone(state);if(next.finance.some(x=>x.id===id))return state;
 next.finance.push({id,date:DEMO_DATE,direction,kind:'expense',category,amount:Math.round(amount*100)/100,description:description.trim()});return next;
}
export function attachInvoice(state,{id,fileName,fileSize,mimeType}){
 const clean=String(fileName||'').trim(),size=Number(fileSize),allowed=/\.(pdf|png|jpe?g)$/i;
 assert(clean&&clean.length<=180&&allowed.test(clean),'Прикрепите счёт в PDF, PNG или JPG');
 assert(Number.isFinite(size)&&size>0&&size<=10*1024*1024,'Размер файла должен быть не более 10 МБ');
 const next=structuredClone(state),payment=next.debts.find(x=>x.id===id&&x.kind==='payable');assert(payment,'Платёж не найден');
 payment.invoice={name:clean,size,type:String(mimeType||''),attachedAt:new Date().toISOString()};
 next.audit.unshift({at:new Date().toISOString(),text:`${payment.party}: прикреплён счёт ${clean}`,actor:'Демо-управляющий'});
 return next;
}
export function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function csvCell(value){const s=String(value??'');return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';}
