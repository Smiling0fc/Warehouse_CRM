import { createSeed } from './seed.js';
import { receive, movePlace, addExpense } from './domain.js';
const KEY='warehouse-crm-demo-v1';
export class DemoRepository {
 constructor(storage=globalThis.localStorage){this.storage=storage;}
 async snapshot(){const text=this.storage.getItem(KEY);if(!text)return createSeed();const s=JSON.parse(text);if(s.schemaVersion!==1||!Array.isArray(s.operations))throw new Error('Демо-данные несовместимы. Откройте настройки и сбросьте демо.');return s;}
 async command(type,payload){const state=await this.snapshot();const reducers={receive,move:movePlace,expense:addExpense};if(!reducers[type])throw new Error('Неизвестная операция');const next=reducers[type](state,payload);this.storage.setItem(KEY,JSON.stringify(next));return next;}
 async reset(){this.storage.removeItem(KEY);return createSeed();}
}
export class HttpRepository {
 constructor(baseUrl){this.baseUrl=baseUrl.replace(/\/$/,'');}
 async request(path,options={}){
  const response=await fetch(this.baseUrl+path,{credentials:'include',...options,headers:{'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(response.status===401?'Войдите через сервер авторизации.':`Сервер вернул ошибку ${response.status}`);
  return response.json();
 }
 snapshot(){return this.request('/workspace');}
 command(type,payload){return this.request('/commands/'+type,{method:'POST',headers:{'Idempotency-Key':payload.requestId||crypto.randomUUID()},body:JSON.stringify(payload)});}
 reset(){throw new Error('Сброс доступен только в демо-режиме');}
}
export function createRepository(config){return config.dataMode==='api'?new HttpRepository(config.apiBaseUrl):new DemoRepository();}
