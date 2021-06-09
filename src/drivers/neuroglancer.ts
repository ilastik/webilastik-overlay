import { vec3, mat4, quat } from "gl-matrix"
import { IViewportDriver, IViewerDriver } from "..";
import { SelectorWidget } from "../gui/widgets/selector_widget";
import { getElementContentRect } from "../util/misc";
import { PrecomputedChunks, PrecomputedChunksScale } from "../util/precomputed_chunks_datasource";
import { NewViewportsHander } from "./viewer_driver";

type NeuroglancerLayout = "4panel" | "xy" | "xy-3d" | "xz" | "xz-3d" | "yz" | "yz-3d";

export class NeuroglancerViewportDriver implements IViewportDriver{
    private viewer: any
    constructor(
        public readonly data_url: string,
        public readonly viewer_driver: NeuroglancerDriver,
        public readonly panel: HTMLElement,
        private readonly orientation_offset: quat,
    ){
        this.viewer = viewer_driver.viewer
    }
    public getCameraPoseInVoxelSpace = () => {
        const orientation_vx = quat.multiply(
            quat.create(), this.viewer.navigationState.pose.orientation.orientation, this.orientation_offset
        )
        const ng_position_obj = this.viewer.navigationState.pose.position
        //old neuroglancers do not have the "value" key
        const position_vx = "value" in ng_position_obj ? ng_position_obj.value : ng_position_obj.spatialCoordinates
        return {
            position_vx: position_vx as vec3,
            orientation_vx: quat.normalize(orientation_vx, orientation_vx),
        }
    }
    public getVoxelToWorldMatrix = () => mat4.fromScaling(mat4.create(), vec3.fromValues(1, -1, -1))
    public getZoomInPixelsPerVoxel = () => 1 / this.viewer.navigationState.zoomFactor.value
    public getGeometry = () => {
        const panelContentRect = getElementContentRect(this.panel)
        const trackedElementRect = getElementContentRect(this.viewer_driver.getTrackedElement())
        return {
            left: panelContentRect.left - trackedElementRect.left,
            bottom: panelContentRect.bottom - trackedElementRect.bottom,
            width: panelContentRect.width,
            height: panelContentRect.height,
        }
    }
    public getInjectionParams = () => ({
        precedingElement: this.panel,
        // zIndex: 10
    })
}

export class NeuroglancerDriver implements IViewerDriver{
    constructor(public readonly viewer: any){}
    getTrackedElement() : HTMLElement{
        return document.querySelector("canvas")! //FIXME: double-check selector
    }
    async getViewportDrivers(): Promise<Array<IViewportDriver>>{
        const panels = Array(...document.querySelectorAll(".neuroglancer-panel")) as Array<HTMLElement>;
        const layout: NeuroglancerLayout = this.viewer.state.toJSON()["layout"]
        const orientation_offsets = new Map<string, quat>([
            ["xy", quat.create()],
            ["xz", quat.setAxisAngle(quat.create(), vec3.fromValues(1, 0, 0), Math.PI / 2)], // FIXME
            ["yz", quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), Math.PI / 2)],//FIXME
        ])
        const data_url = (await this.getDataUrl())?.toString()
        if(data_url === undefined){
            return []
        }
        if(layout == "4panel"){
            console.log("Detected 4panel layout!s!")
            return [
                new NeuroglancerViewportDriver(data_url, this, panels[0], orientation_offsets.get("xy")!),
                new NeuroglancerViewportDriver(data_url, this, panels[1], orientation_offsets.get("xz")!),
                new NeuroglancerViewportDriver(data_url, this, panels[3], orientation_offsets.get("yz")!),
            ]
        }
        return [new NeuroglancerViewportDriver(data_url, this, panels[0], orientation_offsets.get(layout.replace("-3d", ""))!)]
    }
    onViewportsChanged(handler: NewViewportsHander){
        //FIXME: check that this async works fine
        this.viewer.layout.changed.add(async () => {
            handler(await this.getViewportDrivers())
        })
    }
    refreshViews(views: Array<{name: string, url: string}>, channel_colors: Array<vec3>): void{
        views.forEach(view => this.refreshLayer({
            name: view.name, url: view.url, shader: this.makePredictionsShader(channel_colors)
        }))
    }

    private getLayerManager(): any {
        return this.viewer.layerSpecification.layerManager;
    }

    private dropLayer(name: string){
        const layerManager = this.getLayerManager();
        const predictionsLayer = layerManager.getLayerByName(name);

        if(predictionsLayer !== undefined){
            layerManager.removeManagedLayer(predictionsLayer);
        }
    }

    public async refreshLayer({name, url, shader}: {name: string, url: string, shader: string}){
        console.log(`Refreshing layer ${name} with url ${url}`)
        this.dropLayer(name)
        const newPredictionsLayer = this.viewer.layerSpecification.getLayer(
            name,
            {source: url, shader: shader}
        );
        this.viewer.layerSpecification.add(newPredictionsLayer);
    }

    private makePredictionsShader(channel_colors: Array<vec3>): string{
            let color_lines = channel_colors.map((c: vec3, idx: number) => {
                return `vec3 color${idx} = (vec3(${c[0]}, ${c[1]}, ${c[2]}) / 255.0) * toNormalized(getDataValue(${idx}));`
            })
            let colors_to_mix = channel_colors.map((_: vec3, idx: number) => `color${idx}`)

            return [
                "void main() {",
                "    " + color_lines.join("\n    "),
                "    emitRGBA(",
                `        vec4(${colors_to_mix.join(' + ')}, 1.0)`,
                "    );",
                "}",
            ].join("\n")
    }

    private async getDataUrl(): Promise<string | undefined>{
        //FIXME: what if there are multiple layers of type image?
        const urls : Array<string> = this.viewer.state.toJSON().layers
            .filter((l: any) => l.type == "image")
            .map((l: any) => {
                let url : string = typeof l.source == "string" ? l.source : l.source.url
                return url.replace(/\bgs:\/\//, "https://storage.googleapis.com/")
            });
        const selected_url = await SelectorWidget.select({
            title: "Select a data source:", options: urls, optionRenderer: (url: string) => url
        })
        if(selected_url === undefined){
            return undefined
        }
        if(!selected_url.startsWith("precomputed")){
            alert(`ilastik: Unsupported url: ${selected_url}`) //FIXME
            return undefined
        }
        const precomp_chunks = await PrecomputedChunks.create(selected_url)
        if(precomp_chunks.scales.length == 1){
            precomp_chunks.scales[0].getUrl()
        }
        const selected_scale = await SelectorWidget.select({
            title: "Select a scale to train ilastik on:",
            options: precomp_chunks.scales,
            optionRenderer: (scale: PrecomputedChunksScale) => scale.resolution.map(axis => `${axis}nm`).join(" x "),
        })
        return selected_scale?.getUrl()
    }

}
