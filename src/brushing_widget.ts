import { vec3 } from "gl-matrix"
import { BrushingOverlay, BrushStroke } from "."
import { createElement, createInput, hexColorToVec3, InlineCss, vec3ToHexColor, vec3ToRgb, vecToString } from "./utils"
import { ToggleButton, VecDisplayWidget } from "./widgets"

export class BrushingWidget{
    public readonly element: HTMLElement
    public readonly colorPicker: HTMLInputElement
    private readonly brushStrokesContainer: HTMLElement

    public currentBrushColor: vec3
    private readonly overlay: BrushingOverlay
    private brushStrokeWidgets: Array<BrushStrokeWidget> = []

    private lastMouseMoveEvent: MouseEvent = new MouseEvent("mousemove")

    constructor({overlay, parentElement, inlineCss, cssClasses}: {
        overlay: BrushingOverlay,
        parentElement: HTMLElement,
        inlineCss?: InlineCss,
        cssClasses?: Array<string>
    }){
        this.overlay = overlay
        this.element = createElement({tagName: "div", parentElement, inlineCss, cssClasses: (cssClasses || []).concat(["BrushingWidget"])})

        let cameraPositionContainer = createElement({tagName: "div", parentElement: this.element})
            createElement({tagName: "h2", parentElement: cameraPositionContainer, innerHTML: "Camera Position"})
            const camera_pos_world_display = new VecDisplayWidget({label: "world: ", parentElement: cameraPositionContainer})
            const camera_pos_voxel_display = new VecDisplayWidget({label: "voxel: ", parentElement: cameraPositionContainer})

            createElement({tagName: "h2", parentElement: cameraPositionContainer, innerHTML: "Cursor Position"})
            const mouse_pos_world_display = new VecDisplayWidget({label: "world: ", parentElement: cameraPositionContainer})
            const mouse_pos_voxel_display = new VecDisplayWidget({label: "voxel: ", parentElement: cameraPositionContainer})

        createElement({tagName: "label", parentElement: this.element, innerHTML: "Brush Color: "})
        this.colorPicker = createInput({inputType: "color", parentElement: this.element, value: "#00ff00"})
        let updateColor =  () => {
            this.currentBrushColor = hexColorToVec3(this.colorPicker.value)
        }
        this.colorPicker.addEventListener("change", updateColor)
        updateColor()

        let enableBrushing = (enable: boolean) => {
            this.overlay.canvas.style.pointerEvents = enable ? "auto" : "none"
        }
        new ToggleButton({parentElement: this.element, value: "🖌", onClick: enableBrushing})
        enableBrushing(false)

        createElement({tagName: "h1", innerHTML: "Brush Strokes", parentElement: this.element})
        this.brushStrokesContainer = createElement({tagName: "ul", parentElement: this.element})

        this.overlay.canvas.addEventListener("mousedown", (mouseDownEvent: MouseEvent) => {
            let currentBrushStroke = new BrushStroke({
                gl: this.overlay.gl,
                start_postition: this.overlay.getMouseVoxelPosition(mouseDownEvent),
                color: this.currentBrushColor,
                camera_position: this.overlay.camera.position_w,
                camera_orientation: this.overlay.camera.orientation,
            })
            this.addBrushStroke(currentBrushStroke)

            let scribbleHandler = (mouseMoveEvent: MouseEvent) => {
                currentBrushStroke.add_voxel(this.overlay.getMouseVoxelPosition(mouseMoveEvent))
            }

            let handlerCleanup = () => {
                this.overlay.canvas.removeEventListener("mousemove", scribbleHandler)
                document.removeEventListener("mouseup", handlerCleanup)
            }
            this.overlay.canvas.addEventListener("mousemove", scribbleHandler)
            document.addEventListener("mouseup", handlerCleanup)
        })

        this.overlay.canvas.addEventListener("mousemove", (mouseMoveEvent: MouseEvent) => {
            this.lastMouseMoveEvent = mouseMoveEvent //store the event so the mouse displays refresh even without moving the mouse
        })

        let render = () => {
            this.overlay.render(this.brushStrokeWidgets.map(w => w.brushStroke))

            const camera_pos_w = this.overlay.camera.position_w;
            camera_pos_world_display.value = camera_pos_w
            camera_pos_voxel_display.value = vec3.transformMat4(vec3.create(), camera_pos_w, this.overlay.worldToVoxel)

            const mouseWorldPosition = this.overlay.getMouseWorldPosition(this.lastMouseMoveEvent)
            mouse_pos_world_display.value = mouseWorldPosition
            const mouseVoxelPosition = this.overlay.getMouseVoxelPosition(this.lastMouseMoveEvent)
            mouse_pos_voxel_display.value = mouseVoxelPosition

            window.requestAnimationFrame(render)
        }

        window.requestAnimationFrame(render)
    }

    public addBrushStroke(brushStroke: BrushStroke){
        this.brushStrokeWidgets.push(
            new BrushStrokeWidget({
                brushStroke,
                parentElement: this.brushStrokesContainer,
                onLabelClicked: () => {
                    this.overlay.snapTo(brushStroke.camera_position, brushStroke.camera_orientation)
                },
                onColorClicked: (color: vec3) => {
                    this.colorPicker.value = vec3ToHexColor(color)
                    this.currentBrushColor = color;
                }
            })
        )
    }
}

export class BrushStrokeWidget{
    public readonly element: HTMLElement
    public readonly brushStroke: BrushStroke

    constructor({brushStroke, parentElement, onLabelClicked, onColorClicked}:{
        brushStroke: BrushStroke,
        parentElement: HTMLElement,
        onLabelClicked? : (event: MouseEvent) => void,
        onColorClicked? : (color: vec3) => void,
    }){
        this.brushStroke = brushStroke
        this.element = createElement({
            tagName: "li",
            parentElement,
            inlineCss: {
                listStyleType: "none",
            }
        })
        createInput({
            inputType: "button",
            value: "🖍️",
            parentElement: this.element,
            inlineCss: {
                // border: "solid 1px black",
                backgroundColor: vec3ToRgb(brushStroke.color),
                color: "black",
            },
            onClick: onColorClicked ? () => { onColorClicked(brushStroke.color) } : undefined
        })
        createElement({
            parentElement: this.element,
            tagName: "span",
            innerHTML: ` at ${vecToString(brushStroke.getVertRef(0))}`,
            onClick: onLabelClicked,
            inlineCss: {
                cursor: "pointer"
            }
        })
    }
}
