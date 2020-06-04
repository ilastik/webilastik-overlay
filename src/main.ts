import { Cube } from './shapes'
import { PerspectiveCamera } from './camera'
import { vec3 } from 'gl-matrix'

let c = document.querySelector("#c")! as HTMLCanvasElement
console.log(`This is the canvas: ${c}`)

let gl = c.getContext("webgl2")!

c.width = 800
c.style.width = c.width + "px"

c.height = 800
c.style.height = c.height + "px"

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


function gogo(x: number, y: number, z: number){
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);


    let cube = new Cube({gl});
    let camera = new PerspectiveCamera({})
    camera.moveTo(vec3.fromValues(x, y, z))
    camera.lookAt(cube.position)

    cube.render(camera)
}

gogo(2,2,0);

(<any>window)['gg'] = gogo