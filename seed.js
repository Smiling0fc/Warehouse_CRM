export const DEMO_DATE = '2026-10-03';
export const directions = { steel: 'Сталь Мастер', own: 'Производство', ff: 'Фулфилмент' };
export const operationLabels = { receive: 'Приёмка', pick: 'Сборка', ship: 'Отгрузка', inspect: 'Проверка' };
export function createSeed() {
  const products = [
    ['p1','steel','SM-201','Печь банная «Тайга»','Сталь Мастер','—','—',126,18,42,1.6],
    ['p2','steel','SM-308','Бак навесной 60 л','Сталь Мастер','—','—',284,32,12,.4],
    ['p3','steel','SM-115','Дымоход, секция 1 м','Сталь Мастер','—','—',642,90,4,.12],
    ['p4','own','WN-104','Шапка вязаная','Собственное производство','Молочный','Единый',780,120,.18,.003],
    ['p5','own','WN-106','Шарф объёмный','Собственное производство','Графит','Единый',560,80,.3,.006],
    ['p6','own','WN-109','Варежки утеплённые','Собственное производство','Песочный','M',940,100,.12,.002],
    ['p7','ff','FF-201','Термобельё, комплект','Клиент «Север»','Чёрный','M',840,140,.4,.005],
    ['p8','ff','FF-202','Носки, набор 3 пары','Клиент «Север»','Ассорти','38–41',1200,200,.2,.003],
    ['p9','ff','FF-307','Плед флисовый','Клиент «Линия»','Синий','150×200',880,60,.8,.02]
  ].map(([id,direction,sku,name,owner,color,size,onHand,reserved,weight,volume])=>({id,direction,sku,name,owner,color,size,onHand,reserved,weight,volume,quarantine:0}));
  products[3].quarantine=24; products[6].quarantine=16; products[2].quarantine=8;
  const employees = Array.from({length:25},(_,i)=>({id:`e${i+1}`,name:['Алексей Смирнов','Мария Волкова','Денис Орлов','Анна Белова','Илья Соколов','Ольга Морозова','Максим Петров','Елена Котова','Павел Лебедев','Ирина Васильева','Андрей Мельников','Дарья Фролова','Никита Зайцев','Софья Никитина','Роман Попов','Ксения Тихонова','Сергей Крылов','Алина Козлова','Михаил Егоров','Вера Лукина','Артём Павлов','Полина Громова','Виктор Фомин','Юлия Власова','Антон Белов'][i],direction:i<10?'steel':i<16?'own':'ff',role:i%3===0?'Приёмщик':i%3===1?'Сборщик':'Кладовщик'}));
  const operations=[],shifts=[],finance=[];
  // Два года демо-истории: последние 60 дней хранятся по дням,
  // более ранние периоды — недельными срезами, чтобы годовые сравнения
  // работали без переполнения localStorage.
  for(let daysAgo=729;daysAgo>=0;daysAgo--) {
    const recent=daysAgo<60;
    if(!recent&&daysAgo%7!==0)continue;
    const factor=recent?1:7;
    const point=new Date(DEMO_DATE+'T00:00:00Z');point.setUTCDate(point.getUTCDate()-daysAgo);
    const date=point.toISOString().slice(0,10),sequence=729-daysAgo;
    for(let i=0;i<25;i++) {
      const employee=employees[i],quantity=((i<10?142:275)+(sequence*13+i*17)%61)*factor;
      const type=['receive','pick','ship'][i%3],rate=employee.direction==='steel'?4:2;
      operations.push({id:`op-${daysAgo}-${i}`,date,employeeId:employee.id,direction:employee.direction,type,quantity,rate,amount:quantity*rate,reference:recent?`Смена ${date}`:`Неделя ${date}`,confirmed:true});
      shifts.push({id:`shift-${daysAgo}-${i}`,date,employeeId:employee.id,hours:8*factor,basePay:800*factor});
    }
    for(const [j,direction] of ['steel','own','ff'].entries()) {
      if(direction!=='own') for(const [k,category] of ['Хранение','Обработка'].entries()) finance.push({id:`rev-${daysAgo}-${j}-${k}`,date,direction,kind:'revenue',category,amount:((direction==='ff'?30000:21000)+(sequence%31)*260+j*900+k*7500)*factor,description:category+' · демо-начисление'});
      for(const [k,category] of ['Аренда','Коммунальные услуги','Упаковка'].entries()) finance.push({id:`cost-${daysAgo}-${j}-${k}`,date,direction,kind:'expense',category:category,amount:([6800,1150,1900][k]+j*170)*factor,description:category+' · распределённая часть'});
    }
  }
  const receipts=[
    {id:'IN-1048',productId:'p7',direction:'ff',owner:'Клиент «Север»',expected:420,places:14,arrived:'2026-10-03T07:40:00+03:00',status:'waiting'},
    {id:'IN-1049',productId:'p1',direction:'steel',owner:'Сталь Мастер',expected:64,places:16,arrived:'2026-10-03T10:20:00+03:00',status:'waiting'},
    {id:'IN-1050',productId:'p4',direction:'own',owner:'Собственное производство',expected:360,places:12,arrived:'2026-10-03T11:15:00+03:00',status:'waiting'},
    {id:'IN-1051',productId:'p9',direction:'ff',owner:'Клиент «Линия»',expected:180,places:9,arrived:'2026-10-03T12:10:00+03:00',status:'waiting'}
  ];
  const places=products.map((p,i)=>({id:`GM-${1040+i}`,direction:p.direction,owner:p.owner,productId:p.id,quantity:Math.min(p.onHand, i<3?12:60),location:`${i<3?'A':i<6?'B':'C'}-${String(i+1).padStart(2,'0')}-01`,status:'stored',history:[{at:'2026-10-02T10:00:00+03:00',text:'Размещено на хранение',actor:'Демо-оператор'}]}));
  return {schemaVersion:1,asOf:'2026-10-03T16:00:00+03:00',products,employees,operations,shifts,finance,receipts,places,
    debts:[{id:'d1',direction:'ff',kind:'receivable',party:'Клиент «Север»',amount:186000,due:'2026-10-02',description:'Хранение и обработка'}, {id:'d2',direction:'steel',kind:'receivable',party:'Сталь Мастер',amount:92000,due:'2026-10-08',description:'Складские услуги'}, {id:'d3',direction:'ff',kind:'payable',party:'Арендодатель · зона ФФ',amount:120000,due:'2026-10-05',description:'Аренда'}, {id:'d4',direction:'steel',kind:'payable',party:'Поставщик упаковки',amount:42000,due:'2026-10-07',description:'Расходные материалы'}],
    zones:[{name:'Сталь Мастер',direction:'steel',area:1200,used:864},{name:'Производство',direction:'own',area:700,used:448},{name:'Фулфилмент',direction:'ff',area:800,used:680},{name:'Проверка и брак',direction:null,area:300,used:108}], audit:[]};
}
