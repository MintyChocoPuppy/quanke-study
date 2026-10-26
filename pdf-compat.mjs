// Small standard-library compatibility shims for the bundled PDF.js release.
const define=(target,key,value)=>{if(!target[key])Object.defineProperty(target,key,{value,configurable:true,writable:true});};
define(Map.prototype,'getOrInsertComputed',function(key,make){if(this.has(key))return this.get(key);const value=make(key);this.set(key,value);return value;});
define(Map.prototype,'getOrInsert',function(key,value){if(this.has(key))return this.get(key);this.set(key,value);return value;});
define(Set.prototype,'intersection',function(other){return new Set([...this].filter(x=>other.has(x)));});
define(Promise,'try',function(fn,...args){return new this(resolve=>resolve(fn(...args)));});
define(Promise,'withResolvers',function(){let resolve,reject;const promise=new this((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};});
define(Uint8Array.prototype,'toHex',function(){return [...this].map(x=>x.toString(16).padStart(2,'0')).join('');});
define(Uint8Array,'fromBase64',function(text){return Uint8Array.from(atob(text),x=>x.charCodeAt(0));});
define(Uint8Array.prototype,'toBase64',function(){let text='';for(let i=0;i<this.length;i+=8192)text+=String.fromCharCode(...this.subarray(i,i+8192));return btoa(text);});
define(Math,'sumPrecise',function(values){let parts=[],special=0,allNegativeZero=true;for(const value of values){if(typeof value!=='number')throw new TypeError('Expected number');if(!Object.is(value,-0))allNegativeZero=false;if(!Number.isFinite(value)){special+=value;continue;}let x=value,used=0;for(let y of parts){if(Math.abs(x)<Math.abs(y))[x,y]=[y,x];const high=x+y,low=y-(high-x);if(low)parts[used++]=low;x=high;}parts.length=used;parts.push(x);}if(special!==0)return special;let sum=0;for(let i=parts.length-1;i>=0;i--)sum+=parts[i];return sum===0&&allNegativeZero?-0:sum;});
