import {createGame} from '../../src/game/engine';
import {emptyKnowledge,refreshKnowledge} from '../../src/game/visibility';
import {SAVE_KEY} from '../../src/persistence/save';
import {aiRoundFixture,battle60Fixture,winFixture,loseFixture,serialize} from './fixture';
import {navalScenario} from '../helpers/navalScenarios';
const status=document.getElementById('status')!,button=document.getElementById('load') as HTMLButtonElement;
button.disabled=location.port!=='3012';if(button.disabled)status.textContent='Chỉ dùng ở cổng thử 3012.';
button.onclick=()=>{try{const name=(document.getElementById('scenario') as HTMLSelectElement).value;
 let s=name==='battle-60'?battle60Fixture():name==='ai-round'?aiRoundFixture():name==='win'?winFixture():name==='lose'?loseFixture():name==='naval'?navalScenario():createGame({seed:'pace-02'});
 if(name==='study'){s.resources.player={gold:80,food:100,wood:60,stone:60};s.technologies.player=['recon','basic_woodworking','basic_agriculture'];}
 if(name==='naval'){s.turn='player';s.units.forEach(u=>u.owner='player');for(const c of s.cities)if(c.owner)c.owner=c.owner==='player'?'enemy':'player';for(const f of s.factions)s.knowledge[f]=emptyKnowledge();refreshKnowledge(s);}
 localStorage.setItem(SAVE_KEY,serialize(s));status.textContent=`Đã nạp ${name}`;location.href='/tests/perf/app.html?debug-world';
 }catch(error){status.textContent=String(error);}};
