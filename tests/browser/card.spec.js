import {test,expect} from '@playwright/test';
test('measurement, units, optional features and animation checks',async({page})=>{
  await page.goto('/demo/');await page.getByRole('button',{name:'Run checks'}).click();
  await expect(page.getByRole('status')).toContainText('checks passed');
  await expect(page.getByRole('status')).not.toContainText('FAIL');
});
test('phone layout has no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/demo/');
  await expect(page.getByRole('button',{name:/^SPEED:/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('wide panel degrades clearly without optional dependency',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/demo/');
  await page.evaluate(()=>{document.querySelector('#card-wrap').style.maxWidth='none';window.demo.card.hass={...window.demo.card._hass,callWS:async()=>[]};window.demo.card._watchWidth();});
  await expect(page.getByText('Install Mini Graph Card to show history, or set show_history: false.')).toBeVisible();
});
test('wide history can be disabled',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/demo/');
  await page.evaluate(()=>{const d=window.demo;d.card.setConfig({show_history:false,entities:d.ids});d.card.hass={states:Object.fromEntries(Object.entries(d.ids).map(([k,id])=>[id,{state:String(d.values[k]),attributes:{unit_of_measurement:d.units[k]}}]))};});
  await expect(page.getByRole('complementary',{name:'History panel'})).toBeHidden();
});
