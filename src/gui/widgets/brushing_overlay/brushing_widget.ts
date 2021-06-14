import { quat, vec3 } from "gl-matrix"
import { IViewerDriver, BrushStroke } from "../../.."
import { Applet } from "../../../client/applets/applet"
import { DataSource, Session } from "../../../client/ilastik"
import { IDataSourceScale, IViewportDriver } from "../../../drivers/viewer_driver"
import { createElement, vec3ToRgb, vecToString, createSelect, createInput, removeElement } from "../../../util/misc"
import { PrecomputedChunks } from "../../../util/precomputed_chunks_datasource"
import { ensureJsonArray } from "../../../util/serialization"
import { CollapsableWidget } from "../collapsable_applet_gui"
import { SimpleSelectorWidget } from "../selector_widget"
import { Vec3ColorPicker } from "../vec3_color_picker"
import { BrushingOverlay } from "./brushing_overlay"
import { BrushelBoxRenderer } from "./brush_boxes_renderer"
import { BrushelLinesRenderer } from "./brush_lines_renderer"
import { BrushRenderer } from "./brush_renderer"

export class BrushingWidget extends Applet<Array<BrushStroke>>{
    public readonly viewer_driver: IViewerDriver
    public readonly element: HTMLElement
    private readonly brushStrokesContainer: HTMLElement

    public readonly colorPicker: Vec3ColorPicker
    public readonly rendererDropdown: RendererDropdown
    private readonly overlay: BrushingOverlay
    private brushStrokeWidgets: Array<BrushStrokeWidget> = []
    private brushing_scale_selector: SimpleSelectorWidget<IDataSourceScale>
    public readonly status_display: HTMLElement
    private refreshStart: Date = new Date()

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
            onNewState: (new_state) => this.onNewState(new_state)
        })
        this.overlay = new BrushingOverlay({
            viewer_driver,
            brush_stroke_handler: {
                handleNewBrushStroke: (params: {start_position_uvw: vec3, camera_orientation_uvw: quat}) => {
                    const stroke = new BrushStroke({
                        gl: this.overlay.gl,
                        start_postition: params.start_position_uvw, //FIXME put scale somewhere
                        color: this.colorPicker.getColor(),
                        annotated_data_source: new DataSource(this.brushing_scale_selector.getSelection()!.url),
                        camera_orientation: params.camera_orientation_uvw, //FIXME: realy data space? rename param in BrushStroke?
                    })
                    this.doAddBrushStroke(stroke)
                    return stroke
                },
                handleFinishedBrushStroke: (_) => this.updateUpstreamState(this.getBrushStrokes())
            },
        })
        this.element = new CollapsableWidget({display_name: "Training", parentElement}).element
        this.element.classList.add("ItkBrushingWidget")
        this.viewer_driver = viewer_driver
        if(viewer_driver.onViewportsChanged){
            viewer_driver.onViewportsChanged(async () => this.refreshDatasource())
        }

        this.status_display = createElement({tagName:"p", parentElement: this.element, cssClasses: ["ItkBrushingWidget_status_display"]})

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
        createElement({tagName: "label", innerHTML: "Data resolution (voxel size): ", parentElement: p})
        this.brushing_scale_selector  = SimpleSelectorWidget.empty<IDataSourceScale>(p)

        p = createElement({tagName: "p", parentElement: this.element})
        createElement({tagName: "label", innerHTML: "Brush Color: ", parentElement: p})
        this.colorPicker = new Vec3ColorPicker({parentElement: p})


        const rendererControlsContainer = createElement({tagName: "p", parentElement: this.element})
        rendererControlsContainer.style.display = (window as any).ilastik_debug ? "block" : "none"
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

        createElement({tagName: "h2", innerHTML: "Brush Strokes", parentElement: this.element})
        this.brushStrokesContainer = createElement({tagName: "table", parentElement: this.element, cssClasses: ["ItkBrushingWidget_strokes-container"]})

        this.refreshDatasource()

        let render = () => {
            this.overlay.render(this.brushStrokeWidgets.map(w => w.brushStroke), this.rendererDropdown.getRenderer())
            window.requestAnimationFrame(render)
        }

        window.requestAnimationFrame(render)
    }

    public showStatus(message: string){
        this.status_display.innerHTML = message
    }

    public clearError(){
        this.status_display.innerHTML = ""
    }

    public async refreshDatasource(){
        //this is necessary for preventing racing
        const refreshStart = new Date()
        this.refreshStart = refreshStart

        let refreshWidgets = (
            scale_opts: IDataSourceScale[], status_message: string, viewport_drivers: IViewportDriver[]
        ) => {
            if(refreshStart.getTime() < this.refreshStart.getTime()){
                return
            }
            removeElement(this.brushing_scale_selector.element)
            this.brushing_scale_selector = new SimpleSelectorWidget<IDataSourceScale>({
                parentElement: p,
                options: scale_opts,
                optionRenderer: (scale) => `${scale.resolution[0]} x ${scale.resolution[1]} x ${scale.resolution[2]} nm`,
                onSelection: (_) => {},
            })
            this.showStatus(status_message)
            this.overlay.refreshViewports(viewport_drivers)
        }

        const url = this.viewer_driver.getUrlOnDisplay()
        const p = this.brushing_scale_selector.element.parentElement!;
        if(url === undefined){
            return refreshWidgets([], "No selected training image", [])
        }
        if(!url.startsWith("precomputed")){
            return refreshWidgets([], `Unsuported URL for training image: ${url}`, [])
        }
        try{
            const precomp_chunks = await PrecomputedChunks.create(url)
            const viewport_drivers = await this.viewer_driver.getViewportDrivers()
            refreshWidgets(
                precomp_chunks.scales.map((precomp_scale) => ({
                    url: precomp_scale.getUrl(),
                    resolution: [...precomp_scale.resolution],
                })),
                `Now training on ${url}`,
                viewport_drivers
            )
        }catch(e){
            removeElement(this.brushing_scale_selector.element)
            this.showStatus(`Error: ${e}`)
            return
        }
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
        this.brushStrokeWidgets.forEach(bsw => bsw.destroy())
        this.brushStrokeWidgets = []
        brush_strokes.forEach(stroke => this.doAddBrushStroke(stroke))
    }

    public destroy(){
        this.overlay.destroy()
        removeElement(this.element)
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
