var c = <HTMLCanvasElement>document.querySelector("#c")!
console.log(`This is the canvas: ${c}`)

var gl = c.getContext("webgl2")
if(gl === undefined){
    throw "Not webgl2!!!!!!!!!!!!!!!"
}

c.width = 800
c.height = 600
