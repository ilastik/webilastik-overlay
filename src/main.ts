import { Cube } from './shapes'
//import { Plane } from './shapes'

import { SlicingCamera, PerspectiveCamera } from './camera'
//import { OrthoCamera } from './camera'

import { vec3, vec4 } from 'gl-matrix'
import { createInput, createElement } from './utils'
import { CameraControls } from './controls'

let c = document.querySelector("#c")! as HTMLCanvasElement
console.log(`This is the canvas: ${c}`)

let gl = c.getContext("webgl2", {depth: true, stencil: true})!

gl.enable(gl.DEPTH_TEST)
gl.enable(gl.STENCIL_TEST)

c.width = 800
c.style.width = c.width + "px"

c.height = 800
c.style.height = c.height + "px"

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);



let cube = new Cube({gl,  scale: vec3.fromValues(0.5, 0.5, 0.5)});
// let camera = new OrthoCamera({
//     left:   -10, right:  10,
//     near:     0,   far: 100,
//     bottom: -10,   top:  10
// })
let camera = new PerspectiveCamera({})
let slicing_camera = new SlicingCamera(gl, camera, vec3.fromValues(0,0,-3))
let controls = new CameraControls()


let cube_controls = createElement({tagName: "div", parentElement: document.body})
createElement({tagName: "label", parentElement: cube_controls, innerHTML: "Cube Y rotation (rads): "})
let rads_input = createInput({inputType: "text", parentElement: cube_controls, value: "0.02"})

let center_view_controls = createElement({tagName: "div", parentElement: document.body})
createInput({inputType: "button", value: "Center cam on cube", parentElement: center_view_controls, click: () => {
    camera.lookAt({target_w: cube.position, position_w: camera.position_w, up_w: vec3.fromValues(0, 1, 0), })
}})


function renderLoop(){
    controls.updateCamera(camera);

    let angle_rads = parseFloat(rads_input.value)
    cube.rotateY(angle_rads)

    slicing_camera.sliced_render(cube, vec4.fromValues(0,0,1, 1));

    window.requestAnimationFrame(renderLoop)
}

camera.lookAt({target_w: cube.position, position_w: vec3.fromValues(0, 0, 2.5), up_w: vec3.fromValues(0, 1, 0), })
window.requestAnimationFrame(renderLoop)
