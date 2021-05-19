import { vec3 } from "gl-matrix"
import { IViewerDriver, BrushStroke } from "../../.."
import { Session } from "../../../client/ilastik"
import { createElement, vec3ToRgb, vecToString, createSelect, createInput } from "../../../util/misc"
import { ensureJsonArray } from "../../../util/serialization"
import { CollapsableAppletGui } from "../collapsable_applet_gui"
import { Vec3ColorPicker } from "../vec3_color_picker"
import { BrushingOverlay } from "./brushing_overlay"
import { BrushelBoxRenderer } from "./brush_boxes_renderer"
import { BrushelLinesRenderer } from "./brush_lines_renderer"
import { BrushRenderer } from "./brush_renderer"

export class BrushingWidget extends CollapsableAppletGui<Array<BrushStroke>>{
    public readonly viewer_driver: IViewerDriver
    private readonly brushStrokesContainer: HTMLElement

    public readonly colorPicker: Vec3ColorPicker
    public readonly rendererDropdown: RendererDropdown
    private readonly overlay: BrushingOverlay
    private brushStrokeWidgets: Array<BrushStrokeWidget> = []

    // private lastMouseMoveEvent: MouseEvent = new MouseEvent("mousemove")

    constructor({
        session,
        parentElement,
        viewer_driver,
    }: {
        session: Session,
        parentElement: HTMLElement,
        viewer_driver: IViewerDriver,
    }){
        super({
            name: "brushing_applet",
            deserializer: (data) => {
                let raw_annotations = ensureJsonArray(data);
                return raw_annotations.map(a => BrushStroke.fromJsonValue(this.overlay.gl, a))
            },
            session,
            parentElement,
            display_name: "Training",
        })
        this.overlay = new BrushingOverlay({
            viewer_driver,
            brush_stroke_handler: {
                getCurrentColor: () => this.colorPicker.getColor(),
                handleNewBrushStroke: (stroke) => this.doAddBrushStroke(stroke),
                handleFinishedBrushStroke: (_) => this.updateUpstreamState(this.getBrushStrokes())
            },
        })
        this.viewer_driver = viewer_driver
        this.element.classList.add("BrushingWidget")

        let p: HTMLElement;

        p = createElement({tagName:"p", parentElement: this.element})
        const brushing_enabled_checkbox = createInput({inputType: "checkbox", parentElement: p, onClick: () => {
            this.overlay.setBrushingEnabled(brushing_enabled_checkbox.checked)
        }})
        brushing_enabled_checkbox.id = "brushing_enabled_checkbox"
        this.overlay.setBrushingEnabled(brushing_enabled_checkbox.checked)
        const enable_brushing_label = createElement({tagName: "label", innerHTML: "Enable Brushing", parentElement: p});
        (enable_brushing_label as HTMLLabelElement).htmlFor = brushing_enabled_checkbox.id

        p = createElement({tagName: "p", parentElement: this.element})
        createElement({tagName: "label", innerHTML: "Brush Color: ", parentElement: p})
        this.colorPicker = new Vec3ColorPicker({parentElement: p})


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

        createElement({tagName: "h2", innerHTML: "Brush Strokes", parentElement: this.element})
        this.brushStrokesContainer = createElement({tagName: "table", parentElement: this.element, cssClasses: ["brushStrokesContainer"]})


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
                onColorClicked: (color: vec3) => {
                    this.colorPicker.setColor(color);
                },
                onLabelClicked: (_) => {
                    //FIXME: snap viewer to coord
                },
                onDeleteClicked: (stroke) => {
                    let updated_strokes = this.getBrushStrokes().filter(stk => stk != stroke)
                    this.onNewState(updated_strokes)
                    this.updateUpstreamState(updated_strokes)
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

    constructor({brushStroke, parentElement, onLabelClicked, onColorClicked, onDeleteClicked}:{
        brushStroke: BrushStroke,
        parentElement: HTMLElement,
        onLabelClicked : (stroke: BrushStroke) => void,
        onColorClicked : (color: vec3) => void,
        onDeleteClicked : (stroke: BrushStroke) => void,
    }){
        this.brushStroke = brushStroke
        this.element = createElement({tagName: "tr", parentElement, cssClasses: ["BrushStrokeWidget"], inlineCss: {
            listStyleType: "none",
        }})

        const color_container = createElement({tagName: "td", parentElement: this.element})
        createInput({
            inputType: "button",
            value: "🖌",
            parentElement: color_container,
            inlineCss: {
                backgroundColor: vec3ToRgb(brushStroke.color),
            },
            onClick: () => onColorClicked(brushStroke.color),
        })

        createElement({
            parentElement: this.element,
            tagName: "td",
            innerHTML: `at voxel ${vecToString(brushStroke.getVertRef(0), 0)}`,
            onClick: () => onLabelClicked(brushStroke),
            inlineCss: {
                cursor: "pointer"
            }
        })

        const close_button_cell = createElement({parentElement: this.element, tagName: "td"})
        createInput({
            inputType: "button",
            value: "✖",
            parentElement: close_button_cell,
            cssClasses: ["delete_brush_button"],
            onClick: () => onDeleteClicked(brushStroke),
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
