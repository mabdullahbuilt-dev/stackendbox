import {expect,it} from 'vitest';
import {hostedAcceptanceProfile} from '../scripts/lib/hosted-acceptance-profile.mjs';
it('limits hosted work to the known isolated origins, never the company site',()=>{
  for(const origin of ['https://www.stackendbox.com','https://stackendbox.com','https://stackendbox-production.stackendbox.workers.dev.evil.test','http://stackendbox-production.stackendbox.workers.dev'])
    expect(()=>hostedAcceptanceProfile(origin)).toThrow('Unapproved');
});
it('uses the verified static private namespace without changing legacy preview routing',()=>{
  expect(hostedAcceptanceProfile('https://stackendbox-production.stackendbox.workers.dev',{sessionCount:10})).toMatchObject({staticFrontend:true,vercelPreview:false,apiPrefix:'/client-portal/api/',sessions:10});
  expect(hostedAcceptanceProfile('https://stackendbox-portal-preview.vercel.app')).toMatchObject({vercelPreview:true,apiPrefix:'/api/portal/'});
});
it('bounds concurrency without weakening authentication rate limits',()=>{
  for(const sessionCount of [0,1,11,100,'NaN',2.5])expect(()=>hostedAcceptanceProfile('https://stackendbox-production.stackendbox.workers.dev',{sessionCount})).toThrow('between 2 and 10');
  expect(hostedAcceptanceProfile('https://stackendbox-static-acceptance.stackendbox.workers.dev',{bounded:true}).sessions).toBe(2);
});
