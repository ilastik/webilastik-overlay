import { mat4, quat, vec3, vec4 } from 'gl-matrix'
import { BrushShaderProgram, BrushStroke } from './brush_stroke'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'
import { CameraControls } from './controls'
import { RenderParams } from './gl'
import { createElement, createInput } from './utils'


export class BrushingOverlay{
    public readonly canvas: HTMLCanvasElement
    public readonly gl: WebGL2RenderingContext

    public readonly camera: OrthoCamera
    private camera_controls: CameraControls


    private renderer : BrushShaderProgram
    private device_to_view = mat4.create();

    private pixels_per_voxel = 10

    public setZoom(pixels_per_voxel: number){
        this.pixels_per_voxel = pixels_per_voxel
    }

    public constructor({target, camera_position, camera_orientation}: {
        target: HTMLElement,
        camera_position?: vec3,
        camera_orientation?: quat
    }){
        if(target.style.position == "static"){
            throw "Can't overlay element with .style.position == 'static'"
        }
        this.canvas = <HTMLCanvasElement>createElement({tagName: "canvas", parentElement: target, inlineCss: {
            position: "relative",
            height: "100%",
            width: "100%",
            top: "0",
            left: "0",
        }})

        this.gl = this.canvas.getContext("webgl2", {depth: true, stencil: true})!
        this.camera = new OrthoCamera({
            left: -5, right: 5, near: 0, far: 10, bottom: -5, top:  5,
            position: camera_position, orientation: camera_orientation
        })
        this.camera_controls = new CameraControls()
        this.renderer = new BrushShaderProgram(this.gl)
    }

    public getMouseWorldPosition(ev: MouseEvent): vec3{
        this.camera.get_device_to_world_matrix(this.device_to_view)

        let device_position = vec4.fromValues(
            (ev.offsetX - (this.canvas.scrollWidth / 2)) / (this.canvas.scrollWidth / 2),
           -(ev.offsetY - (this.canvas.scrollHeight / 2)) / (this.canvas.scrollHeight / 2),
            0, //FIXME: make sure this is compatible with camera near/far configs
            1
        )
        let world_position = vec4.create(); vec4.transformMat4(world_position, device_position, this.device_to_view)
        // console.log(`Device: ${vecToStr(device_position)}   World: ${vecToStr(world_position)}`)
        return vec3.fromValues(world_position[0], world_position[1], world_position[2])
    }

    public snapTo(camera_position: vec3, camera_orientation: quat){
        this.camera.moveTo(camera_position)
        this.camera.reorient(camera_orientation)
    }

    public render = (brushStrokes: Array<BrushStroke>) => {
        const canvas = <HTMLCanvasElement>this.gl.canvas
        // const aspect = canvas.scrollWidth / canvas.scrollHeight // FIXME: maybe use ScrollWidth and ScrollHeight?

        //pixels_per_voxel determines the field of view, which is determined in voxel units
        this.camera.reconfigure({
            left: -canvas.scrollWidth / this.pixels_per_voxel / 2,
            right: canvas.scrollWidth / this.pixels_per_voxel / 2,
            near: 0,
            far: 1000, // This could be just 1... but oblique views might mess things up since a cube has length 1 * (3 ^ (1/2)) on opposite corners
            bottom: -canvas.scrollHeight / this.pixels_per_voxel / 2,
            top: canvas.scrollHeight / this.pixels_per_voxel / 2,
        })

        //this sets the size of the framebuffer. It could end up with a different ratio between height and width when compared to the actual
        //displayed canvas. Still, the aspect ratio of the image should be correct because the Camera is setup using the canvas aspect.
        // Worst case scenario: pixel density in x will be different from pixeol density in y, but proportions of the rendered image
        //will still be correct

        //set the actual amount of pixels with which to render
        canvas.width = canvas.scrollWidth
        canvas.height = canvas.scrollHeight
        //tells webgl where to render stuff ((0,0)) and how to scale units into pixels
        this.gl.viewport(0, 0, canvas.scrollWidth, canvas.scrollHeight); //FIXME: shuold aspect play a role here?
        this.camera_controls.updateCamera(this.camera);
        // console.log(`Camera is at ${this.camera.position_w}`)

        this.renderer.render({brush_strokes: brushStrokes, camera: this.camera, renderParams: new RenderParams({})})
    }
}

export class BrushingWidget{
    public readonly element: HTMLElement
    public readonly colorPicker: HTMLInputElement
    private readonly brushStrokesContainer: HTMLElement

    public currentBrushColor: vec3 = vec3.fromValues(1, 0, 0)
    private readonly overlay: BrushingOverlay
    private brushStrokeWidgets: Array<BrushStrokeWidget> = []

    constructor({container, overlay}: {
        container: HTMLElement,
        overlay: BrushingOverlay,
    }){
        this.element = createElement({tagName: "div", parentElement: container, inlineCss: {
            width: "300px",
            height: "300px",
            border: "solid 2px black",
        }})
        createElement({tagName: "span", parentElement: this.element, innerHTML: "Brush Color: "})
        this.colorPicker = createInput({inputType: "color", parentElement: this.element, value: "#FF0000"})
        this.colorPicker.addEventListener("change", () => {
            let channels = this.colorPicker.value.slice(1).match(/../g)!.map(c => parseInt(c, 16) / 255)
            this.currentBrushColor = vec3.fromValues(channels[0], channels[1], channels[2])
        })
        createElement({tagName: "h1", innerHTML: "Brush Strokes", parentElement: this.element})
        this.brushStrokesContainer = createElement({tagName: "ul", parentElement: this.element})

        this.overlay = overlay
        this.overlay.canvas.addEventListener("mousedown", (mouseDownEvent: MouseEvent) => {
            let currentBrushStroke = new BrushStroke({
                gl: this.overlay.gl,
                start_postition: this.overlay.getMouseWorldPosition(mouseDownEvent),
                color: this.currentBrushColor,
                camera_position: this.overlay.camera.position_w,
                camera_orientation: this.overlay.camera.orientation,
            })
            this.addBrushStroke(currentBrushStroke)

            let scribbleHandler = (mouseMoveEvent: MouseEvent) => {
                currentBrushStroke.add_voxel(this.overlay.getMouseWorldPosition(mouseMoveEvent))
            }
            let handlerCleanup = () => {
                this.overlay.canvas.removeEventListener("mousemove", scribbleHandler)
                document.removeEventListener("mouseup", handlerCleanup)
            }
            this.overlay.canvas.addEventListener("mousemove", scribbleHandler)
            document.addEventListener("mouseup", handlerCleanup)
        })

        let render = () => {
            this.overlay.render(this.brushStrokeWidgets.map(w => w.brushStroke))
            window.requestAnimationFrame(render)
        }

        window.requestAnimationFrame(render)
    }

    public addBrushStroke(brushStroke: BrushStroke){
        let stroke_widget = new BrushStrokeWidget(
            brushStroke,
            this.brushStrokesContainer
        )
        this.brushStrokeWidgets.push(stroke_widget)
        stroke_widget.element.addEventListener("click", () => {
            this.overlay.snapTo(brushStroke.camera_position, brushStroke.camera_orientation)
        })
    }
}

function vec3ToRgb(value: vec3): string{
    return "rgb(" + value.map((c: number) => Math.floor(c * 255)).join(", ") + ")"
}

function vec3ToString(value: vec3): string{
    return `<${value[0].toFixed(1)}, ${value[1].toFixed(1)}, ${value[2].toFixed(1)}>`
}

export class BrushStrokeWidget{
    public readonly element: HTMLElement
    constructor(public readonly brushStroke: BrushStroke, parentElement: HTMLElement){
        this.element = createElement({
            tagName: "li",
            parentElement,
            innerHTML: vec3ToRgb(brushStroke.color) + ` at ${vec3ToString(brushStroke.getVertRef(0))}`,
            inlineCss: {
                color: vec3ToRgb(brushStroke.color)
            }
        })
    }
}