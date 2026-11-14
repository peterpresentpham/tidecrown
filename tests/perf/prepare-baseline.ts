// Reproducible pre-integration renderer, using the current rules and unit models.
// Generated under ignored artifacts; no checkout, branch switch or worktree access.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
let source=execFileSync('git',['show','de1d924:src/render/World.ts'],{encoding:'utf8'});
source=source.replace("from './unitModels'","from '../../src/render/unitModels'").replaceAll("from '../game/","from '../../src/game/");
source=source.replace('  private scene =','  private renderedFrames=0;\n  private scene =');
source=source.replace('return {drawCalls:this.renderer.info.render.calls','return {renderedFrames:this.renderedFrames,drawCalls:this.renderer.info.render.calls');
source=source.replace('this.renderer.render(this.scene, this.camera);this.needsDraw=false;','this.renderer.render(this.scene, this.camera);this.renderedFrames++;this.needsDraw=false;');
source=source.replace('  diagnostics(){','  isAnimating(){return !!this.visual;}\n  setVisualSettings(_settings:unknown){}\n  diagnostics(){');
mkdirSync('artifacts/step5-baseline',{recursive:true});writeFileSync('artifacts/step5-baseline/World.ts',source);
console.log('Baseline renderer de1d924 prepared; only a frame counter/read-only hooks added.');
