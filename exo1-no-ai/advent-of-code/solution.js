const fs = require("fs");

const txt = fs.readFileSync("input.txt", "utf-8");

function parseBlocks(data){
    const lines = data.replace(/\r/g, "").split('\n').filter(l=>l.length>0);
    const maxLen =  Math.max(...lines.map((l) => l.length));
    const grid = lines.map(l => l.padEnd(maxLen, ' '));

    const bottomRow = grid[grid.length - 1];
    const opIndices = [];
    for (let c = 0;c<maxLen;c++){
        if(bottomRow[c] ==='+' || bottomRow[c] === '*'){
            opIndices.push(c);
        }
    }

    const blocks = [];
    for(let i = 0; i <opIndices.length;i++){
      const startCol = opIndices[i];
      const endCol = (i+1<opIndices.length)? opIndices[i+1] : maxLen;
      const blockGrid = grid.map(row => row.slice(startCol, endCol));
      const op = bottomRow[startCol];
      blocks.push({blockGrid,op});
    }
    return {grid,blocks,maxLen}
}
function p1(data) {
  const lines = data.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
  const maxLen = Math.max(...lines.map(l=>l.length));
  const grid = lines.map((l) => l.padEnd(maxLen, ' '));

  const emptyCols = [];

  for (let c = 0; c < maxLen; c++) {
    if (grid.every((r) => r[c] === ' ')) {
      emptyCols.push(c);
    }
  }

  let total = 0;
  let start = 0;

  const boundaries = [...emptyCols,maxLen];

  for (const end of [...boundaries]) {
    if (end > start) {
      const slice = grid.map(r=>r.slice(start, end));
      const text = slice.join("");
      const isMult = text.includes('*');
      const nums = [];
      for (let r = 0; r<slice.length;r++) {
        const digits = slice[r].replace(/\D/g,'');
        if(digits !== ''){
          nums.push(BigInt(digits));
        }
      }
      if (nums.length > 0) {
        const res = isMult
          ? nums.reduce((a, b) => a * b, 1n)
          : nums.reduce((a, b) => a + b, 0n);
        total += Number(res);
      }
    }
    start = end + 1;
  }
  return total;
}

function p2(data){
    const lines = data.replace(/\r/g,'').split('\n').filter(l=>l.trim().length>0);
    const maxLen = Math.max(...lines.map(l=>l.length));
    const grid = lines.map(l=>l.padEnd(maxLen, ' '))

    const emptyCols = [];
    for(let c = 0;c<maxLen;c++){
        if(grid.every(r=>r[c]===' ')){
            emptyCols.push(c)
        } 
    }

    let total = 0;
    let start = 0;
    const boundaries = [...emptyCols, maxLen];

    for(const end of boundaries){
        if(end>start){
            const slice = grid.map(r=>r.slice(start,end));
            const isMult = slice.join('').includes('*');
            const nums = [];
            const width = slice[0].length;
            for(let c = 0; c < width;c++){
                let colStr = '';
                for(let r = 0;r< slice.length;r++){
                    colStr += slice[r][c];
                }
                const digits = colStr.replace(/\D/g,'');
                if(digits !==''){
                    nums.push(BigInt(digits));
                }
            }
            if(nums.length>0){
                const res = isMult ? nums.reduce((a,b)=>a*b,1n) : nums.reduce((a,b)=>a+b,0n);
                total += Number(res);
            }
        }
        start = end + 1;
    }
    return total
}

console.log("PartOne", p1(txt));
console.log("PartTwo", p2(txt));

