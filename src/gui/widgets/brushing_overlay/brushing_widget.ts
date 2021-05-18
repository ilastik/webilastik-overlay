import { vec3 } from "gl-matrix"
import { IViewerDriver, BrushStroke } from "../../.."
import { Applet } from "../../../client/applets/applet"
import { Session } from "../../../client/ilastik"
import { createElement, createInput, vec3ToRgb, vecToString, createSelect } from "../../../util/misc"
import { ensureArray } from "../../../util/serialization"
import { ToggleButton } from "../toggle_button"
import { Vec3ColorPicker } from "../vec3_color_picker"
import { BrushingOverlay } from "./brushing_overlay"
import { BrushelBoxRenderer } from "./brush_boxes_renderer"
import { BrushelLinesRenderer } from "./brush_lines_renderer"
import { BrushRenderer } from "./brush_renderer"

export class BrushingWidget extends Applet<Array<BrushStroke>>{
    public readonly element: HTMLElement
    public readonly viewer_driver: IViewerDriver
    private readonly brushStrokesContainer: HTMLElement

    public readonly colorPicker: Vec3ColorPicker
    public readonly brushingEnabler: ToggleButton
    public readonly rendererDropdown: RendererDropdown
    private readonly overlay: BrushingOverlay
    private brushStrokeWidgets: Array<BrushStrokeWidget> = []

    // private lastMouseMoveEvent: MouseEvent = new MouseEvent("mousemove")

    constructor({
        session,
        parentElement,
        viewer_driver,
        cssClasses,
        brushingEnabled
    }: {
        session: Session,
        parentElement: HTMLElement,
        viewer_driver: IViewerDriver,
        cssClasses?: Array<string>,
        brushingEnabled?: boolean,
    }){
        super({
            name: "brushing_applet",
            deserializer: (data) => {
                let raw_annotations = ensureArray(data);
                return raw_annotations.map(a => BrushStroke.fromJsonValue(this.overlay.gl, a))
            },
            session,
        })
        this.viewer_driver = viewer_driver
        this.element = createElement({tagName: "div", parentElement, cssClasses: (cssClasses || []).concat(["BrushingWidget"])})

        const brush_toggle_container = createElement({tagName:"p", parentElement: this.element})
        const brush_color_container = createElement({tagName: "p", parentElement: this.element})

        createElement({tagName: "label", innerHTML: "Brush Color: ", parentElement: brush_color_container})
        this.colorPicker = new Vec3ColorPicker({parentElement: brush_color_container})

        this.overlay = new BrushingOverlay({
            viewer_driver,
            brush_stroke_handler: {
                getCurrentColor: () => this.colorPicker.getColor(),
                handleNewBrushStroke: (stroke) => this.doAddBrushStroke(stroke),
                handleFinishedBrushStroke: (_) => this.updateUpstreamState(this.getBrushStrokes())
            },
        })

        this.brushingEnabler = new ToggleButton({parentElement: brush_toggle_container, value: "🖌 Enable Brushing", checked: brushingEnabled, onChange: (enabled: boolean) => {
            this.overlay.setBrushingEnabled(enabled)
        }})

        const rendererControlsContainer = createElement({tagName: "p", parentElement: this.element})
            createElement({tagName: "label", innerHTML: "Rendering style: ", parentElement: rendererControlsContainer})
            this.rendererDropdown = new RendererDropdown({
                parentElement: rendererControlsContainer,
                options: new Map<string, BrushRenderer>([
                    ["Boxes - Cross Section)", new BrushelBoxRenderer({gl: this.overlay.gl, highlightCrossSection: false, onlyCrossSection: true})],
                    ["Lines", new BrushelLinesRenderer(this.overlay.gl)],
                    ["Boxes", new BrushelBoxRenderer({gl: this.overlay.gl, debugColors: false, highlightCrossSection: false, onlyCrossSection: false})],
                    ["Boxes (debug colors)", new BrushelBoxRenderer({gl: this.overlay.gl, debugColors: true, highlightCrossSection: true, onlyCrossSection: false})],
                ])
            })

        // let cameraPositionContainer = createElement({tagName: "div", parentElement: this.element})
        //     createElement({tagName: "h2", parentElement: cameraPositionContainer, innerHTML: "Camera Position"})
        //     const camera_pos_world_display = new VecDisplayWidget({label: "world: ", parentElement: cameraPositionContainer})
        //     const camera_pos_voxel_display = new VecDisplayWidget({label: "voxel: ", parentElement: cameraPositionContainer})

        //     createElement({tagName: "h2", parentElement: cameraPositionContainer, innerHTML: "Cursor Position"})
        //     const mouse_pos_world_display = new VecDisplayWidget({label: "world: ", parentElement: cameraPositionContainer})
        //     const mouse_pos_voxel_display = new VecDisplayWidget({label: "voxel: ", parentElement: cameraPositionContainer})

        createElement({tagName: "h1", innerHTML: "Brush Strokes", parentElement: this.element})
        this.brushStrokesContainer = createElement({tagName: "ul", parentElement: this.element})


        // this.overlay.canvas.addEventListener("mousemove", (mouseMoveEvent: MouseEvent) => {
        //     this.lastMouseMoveEvent = mouseMoveEvent //store the event so the mouse displays refresh even without moving the mouse
        // })

        let render = () => {
            this.overlay.render(this.brushStrokeWidgets.map(w => w.brushStroke), this.rendererDropdown.getRenderer())

            // camera_pos_world_display.value = this.overlay.camera.position_w
            // camera_pos_voxel_display.value = viewer_driver.getCameraPositionInVoxelSpace()

            // const mouseWorldPosition = this.overlay.getMouseWorldPosition(this.lastMouseMoveEvent)
            // mouse_pos_world_display.value = mouseWorldPosition
            // const mouseVoxelPosition = this.overlay.getMouseVoxelPosition(this.lastMouseMoveEvent)
            // mouse_pos_voxel_display.value = mouseVoxelPosition

            window.requestAnimationFrame(render)
        }

        window.requestAnimationFrame(render)
    }

    public addBrushStroke(brushStroke: BrushStroke){
        this.doAddBrushStroke(brushStroke)
        this.updateUpstreamState(this.brushStrokeWidgets.map(bsw => bsw.brushStroke))
    }

    protected doAddBrushStroke(brushStroke: BrushStroke){
        this.brushStrokeWidgets.push(
            new BrushStrokeWidget({
                brushStroke,
                parentElement: this.brushStrokesContainer,
                // onLabelClicked: () => {
                //     let snapCameraTo = this.viewer_driver.snapCameraTo
                //     if(snapCameraTo){
                //         snapCameraTo(brushStroke.getVertRef(0), brushStroke.camera_orientation)
                //     }
                // },
                onColorClicked: (color: vec3) => {
                    this.colorPicker.setColor(color);
                }
            })
        )
    }

    public getBrushStrokes(): Array<BrushStroke>{
        return this.brushStrokeWidgets.map(bsw => bsw.brushStroke)
    }

    protected onNewState(brush_strokes: Array<BrushStroke>){
        super.onNewState(brush_strokes)
        this.brushStrokeWidgets.forEach(bsw => bsw.destroy())
        this.brushStrokeWidgets = []
        brush_strokes.forEach(stroke => this.doAddBrushStroke(stroke))
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
            innerHTML: ` at voxel ${vecToString(brushStroke.getVertRef(0), 0)}`,
            onClick: onLabelClicked,
            inlineCss: {
                cursor: "pointer"
            }
        })
    }

    public destroy(){
        this.brushStroke.destroy()
        this.element.parentElement?.removeChild(this.element)
    }
}

export class RendererDropdown{
    private renderer: BrushRenderer
    private onChange?: (new_renderer: BrushRenderer) => void;

    constructor({parentElement, options, onChange}:{
        parentElement: HTMLElement,
        options: Map<string, BrushRenderer>,
        onChange?: (new_renderer: BrushRenderer) => void,
    }){
        this.onChange = onChange;
        let values = new Map<string, string>();
        options.forEach((_, key) => values.set(key, key))
        const select = createSelect({parentElement, values})
        select.addEventListener("change", () => {
            this.setRenderer(options.get(select.value)!)
        })

        this.renderer = this.setRenderer(options.values().next().value)
    }

    public setRenderer(renderer: BrushRenderer): BrushRenderer{
        this.renderer = renderer
        if(this.onChange){
            this.onChange(renderer)
        }
        return renderer
    }

    public getRenderer(): BrushRenderer{
        return this.renderer
    }
}
