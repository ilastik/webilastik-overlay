// import { Cube } from './shapes'
//import { Plane } from './shapes'

import { SlicingCamera } from './camera'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'


import { vec3, vec4 } from 'gl-matrix'
// import { createInput, createElement } from './utils'
import { CameraControls } from './controls'

let c = document.querySelector("#c")! as HTMLCanvasElement
console.log(`This is the canvas: ${c}`)

let gl = c.getContext("webgl2", {depth: true, stencil: true})!

c.width = 800
c.style.width = c.width + "px"

c.height = 800
c.style.height = c.height + "px"

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);



let brushStroke = [vec3.fromValues(0, 0, 0)]

let camera = new OrthoCamera({left: -5, right: 5, near: 0, far: 10, bottom: -5, top:  5})
// let camera = new PerspectiveCamera({})
let slicing_camera = new SlicingCamera(gl, camera)
let controls = new CameraControls()


// let cube_controls = createElement({tagName: "div", parentElement: document.body})
// createElement({tagName: "label", parentElement: cube_controls, innerHTML: "Cube Y rotation (rads): "})
// let rads_input = createInput({inputType: "text", parentElement: cube_controls, value: "0.02"})

// let center_view_controls = createElement({tagName: "div", parentElement: document.body})
// createInput({inputType: "button", value: "Center cam on cube", parentElement: center_view_controls, click: () => {
//     camera.lookAt({target_w: cube.position, position_w: camera.position_w, up_w: vec3.fromValues(0, 1, 0), })
// }})


function renderLoop(){
    controls.updateCamera(camera);
    console.log(`Camera is at ${camera.position_w}`)

    // let angle_rads = parseFloat(rads_input.value)
    // cube.rotateY(angle_rads)

    slicing_camera.renderBrushStroke({brushStroke, color: vec4.fromValues(0,0,1, 1)});

    window.requestAnimationFrame(renderLoop)
}

camera.lookAt({target_w: vec3.fromValues(0,0,0), position_w: vec3.fromValues(0, 0, 5), up_w: vec3.fromValues(0, 1, 0), })
window.requestAnimationFrame(renderLoop)
