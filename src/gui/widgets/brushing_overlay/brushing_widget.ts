import { quat, vec3 } from "gl-matrix"
import { IViewerDriver, BrushStroke } from "../../.."
import { DataSource, Session } from "../../../client/ilastik"
import { IDataSourceScale, IViewportDriver } from "../../../drivers/viewer_driver"
import { createElement, createSelect, createInput, removeElement } from "../../../util/misc"
import { PrecomputedChunks } from "../../../util/precomputed_chunks_datasource"
import { CollapsableWidget } from "../collapsable_applet_gui"
import { SimpleSelectorWidget } from "../selector_widget"
import { Vec3ColorPicker } from "../vec3_color_picker"
import { BrushingOverlay } from "./brushing_overlay"
import { BrushelBoxRenderer } from "./brush_boxes_renderer"
import { BrushelLinesRenderer } from "./brush_lines_renderer"
import { BrushRenderer } from "./brush_renderer"
import { BrushStrokesContainer } from "./brush_strokes_container"

export class BrushingWidget{
    public readonly viewer_driver: IViewerDriver
    public readonly element: HTMLElement

    public readonly colorPicker: Vec3ColorPicker
    public readonly rendererDropdown: RendererDropdown
    private readonly overlay: BrushingOverlay
    private brushStrokeContainer: BrushStrokesContainer
    private brushing_scale_selector: SimpleSelectorWidget<IDataSourceScale>
    public readonly status_display: HTMLElement
    private refreshStart: Date = new Date()
    public readonly brushing_enabled_checkbox: HTMLInputElement

    private staging_brush_stroke: BrushStroke | undefined = undefined
    private animationRequestId: number = 0

    constructor({
        session,
        parentElement,
        viewer_driver,
    }: {
        session: Session,
        parentElement: HTMLElement,
        viewer_driver: IViewerDriver,
    }){
        this.overlay = new BrushingOverlay({
            viewer_driver,
            brush_stroke_handler: {
                handleNewBrushStroke: (params: {start_position_uvw: vec3, camera_orientation_uvw: quat}) => {
                    this.staging_brush_stroke = BrushStroke.create({
                        gl: this.overlay.gl,
                        start_postition_uvw: params.start_position_uvw, //FIXME put scale somewhere
                        color: this.colorPicker.getColor(),
                        annotated_data_source: new DataSource(
                            this.brushing_scale_selector.getSelection()!.url,
                            this.brushing_scale_selector.getSelection()!.resolution,
                        ),
                        camera_orientation: params.camera_orientation_uvw, //FIXME: realy data space? rename param in BrushStroke?
                    })
                    return this.staging_brush_stroke
                },
                handleFinishedBrushStroke: (stroke) => {
                    this.brushStrokeContainer.addBrushStroke(stroke)
                    this.staging_brush_stroke = undefined
                }
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
        this.brushing_enabled_checkbox = createInput({inputType: "checkbox", parentElement: p, onClick: () => {
            this.overlay.setBrushingEnabled(this.brushing_enabled_checkbox.checked)
        }})
        this.brushing_enabled_checkbox.id = "brushing_enabled_checkbox"
        this.overlay.setBrushingEnabled(this.brushing_enabled_checkbox.checked)
        const enable_brushing_label = createElement({tagName: "label", innerHTML: "Enable Brushing", parentElement: p});
        (enable_brushing_label as HTMLLabelElement).htmlFor = this.brushing_enabled_checkbox.id

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

        p = createElement({tagName: "p", parentElement: this.element})
        createElement({tagName: "label", innerHTML: "Brush Strokes:", parentElement: p})
        this.brushStrokeContainer = new BrushStrokesContainer({
            parentElement: this.element, session, applet_name: "brushing_applet", gl: this.overlay.gl, onBrushColorClicked: (color: vec3) => this.colorPicker.setColor(color)
        })

        this.refreshDatasource()
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

            if(scale_opts.length == 0 && this.brushing_enabled_checkbox.checked){
                this.brushing_enabled_checkbox.click()
            }
            this.brushing_enabled_checkbox.disabled = scale_opts.length == 0

            window.cancelAnimationFrame(this.animationRequestId)
            const render = () => {
                let strokes = this.brushStrokeContainer.getBrushStrokes()
                if(this.staging_brush_stroke){
                    strokes.push(this.staging_brush_stroke)
                }
                this.overlay.render(strokes, this.rendererDropdown.getRenderer())
                this.animationRequestId = window.requestAnimationFrame(render)
            }
            this.animationRequestId = window.requestAnimationFrame(render)
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
                    url: precomp_scale.getUrl().href,
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

    public destroy(){
        window.cancelAnimationFrame(this.animationRequestId)
        this.overlay.destroy()
        this.brushStrokeContainer.destroy()
        removeElement(this.element)
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
