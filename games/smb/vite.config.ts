import {defineConfig} from 'vite';
export default defineConfig({
 base:'./',
 build:{target:'es2022'},
 optimizeDeps:{entries:['index.html']},
 server:{strictPort:true,watch:{ignored:[
  '**/assets/**','**/model/**','**/screenshots/**','**/evidence/**','**/kage/**','**/tools/**','**/tests/**'
 ]}}
});
