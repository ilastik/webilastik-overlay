import { vec3, quat, mat4 } from "gl-matrix";
import { IViewerDriver } from "..";
import { createElement, ParsedUrl } from "../util/misc";
import { PrecomputedChunks } from "../datasource/precomputed_chunks";
import { IDataView, IViewportDriver, IViewportGeometry } from "./viewer_driver";

export class HtmlImgDriver implements IViewerDriver{
    public readonly img: HTMLImageElement;
    public readonly container: HTMLElement;
    public readonly data_url: ParsedUrl;
    constructor({img}:{img: HTMLImageElement}){
        this.img = img
        this.container = img.parentElement || document.body
        try{
            this.data_url = ParsedUrl.parse(this.img.src)
        }catch{
            this.data_url = ParsedUrl.parse(window.location.href).concat(this.img.src)
        }
    }
    public getViewportDrivers() : Array<HtmlImgViewportDriver>{
        return [new HtmlImgViewportDriver(this.img)]
    }
    public getTrackedElement(): HTMLImageElement{
        return this.img
    }
    public refreshView(view: {name: string, url: string, similar_url_hint?: string, channel_colors?: vec3[]}){
        const output_css_class = "ilastik_img_output_image"
        document.querySelectorAll("." + output_css_class).forEach(element => {
            const htmlElement = (element as HTMLElement)
            htmlElement.parentElement?.removeChild(htmlElement)
        })
        const container = createElement({tagName: "div", parentElement: this.img.parentElement!, cssClasses: [output_css_class]})
        PrecomputedChunks.create(ParsedUrl.parse(view.url)).then(precomp_chunks => {
            const scale = precomp_chunks.scales[0]
            const increment = 128
            for(let y=0; y<this.img.height; y += increment){
                let row = createElement({tagName: "div", parentElement: container})
                for(let x=0; x<this.img.width; x += increment){
                    let tile = createElement({tagName: "img", parentElement: row, inlineCss: {float: "left"}}) as HTMLImageElement
                    tile.src = scale.getChunkUrl({
                        x: [x, Math.min(x + increment, this.img.width)],
                        y: [y, Math.min(y + increment, this.img.height)],
                        z: [0, 1]
                    })
                    .withAddedSearchParams(new Map([["format", "png"]]))
                    .href.replace(/^precomputed:\/\//, "")
                }
            }
        })
    }
    public getDataViewOnDisplay(): IDataView | undefined{
        return {name: this.data_url.name, url: this.data_url.href}
    }
}

export class HtmlImgViewportDriver implements IViewportDriver{
    private voxelToWorld = mat4.fromScaling(mat4.create(), vec3.fromValues(1, -1, -1))

    constructor(public readonly img: HTMLImageElement){
    }
    public getGeometry(): IViewportGeometry{
        return {left: 0, bottom: 0, height: this.img.height, width: this.img.width}
    }
    public getCameraPoseInUvwSpace(): {position_uvw: vec3, orientation_uvw: quat}{
        return {
            position_uvw: vec3.fromValues(this.img.width / 2, this.img.height / 2, 0),
            orientation_uvw: quat.create(),
        }
    }
    public getUvwToWorldMatrix(): mat4{
        return this.voxelToWorld
    }
    public getZoomInPixelsPerNm(): number{
        return 1
    }
}
