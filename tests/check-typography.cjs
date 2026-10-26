const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'..'),scope={};vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(root,'src/studio-text.js'),'utf8'),scope);
const plain=x=>JSON.parse(JSON.stringify(x)),defaults=scope.studioTypographySettings();
assert.deepEqual(plain(scope.studioTypographySettings(null)),plain(defaults));
assert.equal(scope.studioTypographyLayoutChanged(defaults),false,'old saved projects retain the original layout');
for(const key of ['name','character','author','caption','subtitle']){
  const normalized=scope.studioTypographySettings({[key]:{text:'\0NOVA\n名字',scale:Infinity,tracking:99,font:'url(evil)',weight:'900;evil',color:'red',colorMode:'custom',case:'uppercase'}})[key];
  assert.equal(normalized.text,' NOVA 名字');assert.equal(normalized.scale,1);assert.equal(normalized.tracking,.25);assert.equal(normalized.font,'auto');assert.equal(normalized.weight,'auto');assert.equal(normalized.color,'#f3f0e5');
}
const settings=scope.studioTypographySettings({name:{text:'Nonas',case:'uppercase',scale:.8},author:{text:'KGG',font:'serif',colorMode:'custom',color:'#ef72aa'},copy:{character:{kicker:'ORIGINAL CHARACTER',label:'ATELIER / 003',meta:'some details'}}});
assert.equal(scope.studioTypographyValue(settings,'name','fallback'),'NONAS','case is real editable text, not a CSS-only preview');
assert.equal(scope.studioTypographyValue(defaults,'name','NOVA'),'NOVA','no period is appended');
assert.equal(scope.studioTypographyValue(defaults,'character','角色'),'角色');
assert.equal(scope.studioTypographyCopy(settings,'character','kicker','old'),'ORIGINAL CHARACTER');
assert.equal(scope.studioTypographyCopy(settings,'author','kicker','CREATOR'),'CREATOR');
assert.deepEqual(plain(scope.studioTypographySettings(JSON.parse(JSON.stringify(settings)))),plain(settings),'saved and standalone-output snapshots round-trip all text overrides');
scope.state={typography:settings};
const style={setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]},get fontSize(){return this['font-size']||''},set fontSize(v){this['font-size']=v}},el={style};
scope.getComputedStyle=node=>({fontSize:node.style.fontSize||'100px'});
scope.studioTypographyStyle(el,'author');assert.equal(style.color,'#ef72aa');assert.ok(style['font-family'].includes('Cormorant'));
scope.state.typography=scope.studioTypographySettings({author:{font:'rounded'}});scope.studioTypographyStyle(el,'author');assert.ok(style['font-family'].indexOf('Nunito')<style['font-family'].indexOf('ChillRoundF'));assert.ok(style['font-family'].indexOf('ChillRoundF')<style['font-family'].indexOf('Microsoft YaHei'),'Chinese rounded outlines precede the system fallback');scope.state.typography=settings;
scope.studioTypographyFontSize(el,'name');assert.equal(style.fontSize,'80px');scope.studioTypographyFontSize(el,'name');assert.equal(style.fontSize,'80px','repeated layout measurements never accumulate scaling');
scope.state.typography=defaults;scope.studioTypographyStyle(el,'author');scope.studioTypographyFontSize(el,'author');assert.equal(style.color,undefined);assert.equal(style['font-family'],undefined);assert.equal(style.fontSize,'','reset restores scheme CSS including responsive sizes');
const ae=fs.readFileSync(path.join(root,'runtime/ae-import-template.jsx'),'utf8'),aeScope={app:{fonts:{getFontsByPostScriptName(name){return [{isSubstitute:false}];}}},warnings:[]};vm.createContext(aeScope);vm.runInContext(ae.slice(ae.indexOf('var fontCache={}'),ae.indexOf('    function text(')),aeScope);
for(const [weight,suffix] of [[400,'Regular'],[700,'Bold'],[900,'Bold']])assert.equal(aeScope.fontFor({text:'粗奶丸',weight,fontFamily:'Nunito, ChillRoundF, sans-serif'}),'ChillRoundF'+suffix,'AE matches the rounded Chinese desktop font when installed');
assert.equal(aeScope.fontFor({text:'角色',weight:700,fontFamily:'Microsoft YaHei UI'}),'MicrosoftYaHei-Bold','other Chinese font choices retain their fallback');
for(const [key,family,postScriptName]of [['cn-serif','ZCOOL XiaoWei','ZCOOLXiaoWei-Regular'],['brush','Ma Shan Zheng','MaShanZheng-Regular'],['playful','ZCOOL KuaiLe','ZCOOLKuaiLe-Regular']]){
 const settings=scope.studioTypographySettings({name:{font:key}});assert.equal(settings.name.font,key);assert.ok(scope.studioFontFamily(key).includes(family));assert.equal(aeScope.fontFor({text:'角色',weight:700,fontFamily:family}),postScriptName);
}
const custom='custom:'+'a'.repeat(32);assert.equal(scope.studioTypographySettings({name:{font:custom}}).name.font,custom);assert.ok(scope.studioFontFamily(custom).includes('StudioUser_'+'a'.repeat(32)));assert.equal(scope.studioTypographySettings({name:{font:'custom:unsafe'}}).name.font,'auto');
console.log('PASS: typography migration, bounded restore, custom copy/case, snapshot round-trip, custom color priority and nonaccumulating responsive font sizing.');
