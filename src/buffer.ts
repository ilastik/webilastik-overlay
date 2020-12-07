import { AttributeElementType, AttributeNumComponents, BinaryArray } from "./gl";
import { AttributeLocation } from "./shader";

export class VertexArrayObject{
    private glAttributeObject : WebGLVertexArrayObject
    constructor(public readonly gl: WebGL2RenderingContext){
        let vao = this.gl.createVertexArray();
        if(vao === null){
            throw `Could not create vertex GlslAttribute object`
        }
        this.glAttributeObject = vao;
    }

    public bind(){
        this.gl.bindVertexArray(this.glAttributeObject);
    }

    public unbind(){
        this.gl.bindVertexArray(null);
    }

    protected vertexAttribPointer<Arr extends BinaryArray>({buffer, location, byteOffset=0, normalize, numComponents, elementType}:{
        buffer: Buffer<Arr>,
        location: AttributeLocation,
        byteOffset?: number,
        normalize: boolean,
        numComponents: AttributeNumComponents,
        elementType: AttributeElementType
    }){
        this.bind();
        this.gl.enableVertexAttribArray(location.raw);
        buffer.bind()
        this.gl.vertexAttribPointer(
            /*index=*/location.raw,
            /*size=*/numComponents,
            /*type=*/elementType,
            /*normalize=*/normalize,
            /*stride=*/0,
            /*offset=*/byteOffset
        )
        this.unbind()
    }
}

export enum BindTarget {
    ARRAY_BUFFER = WebGL2RenderingContext.ARRAY_BUFFER,
    ELEMENT_ARRAY_BUFFER = WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER,
}

export enum BufferUsageHint{
    STATIC_DRAW = WebGL2RenderingContext.STATIC_DRAW,
    DYNAMIC_DRAW = WebGL2RenderingContext.DYNAMIC_DRAW,
}

export abstract class Buffer<Arr extends BinaryArray>{
    protected glbuffer: WebGLBuffer

    constructor(
        public readonly gl: WebGL2RenderingContext,
        data: Arr,
        usageHint: BufferUsageHint,
        public readonly name="",
    ){
        let buf = gl.createBuffer();
        if(buf === null){
            throw `Could not create buffer`
        }
        this.glbuffer = buf
        this.populate(data, usageHint)
    }

    public abstract get_bind_target(): BindTarget;

    public destroy(){
        this.gl.deleteBuffer(this.glbuffer)
    }

    public bind(){
        this.gl.bindBuffer(this.get_bind_target(), this.glbuffer);
    }

    public unbind(){
        this.gl.bindBuffer(this.get_bind_target(), null);
    }

    public populate(data: Arr, usageHint: BufferUsageHint){
        this.bind()
        this.gl.bufferData(this.get_bind_target(), data, usageHint)
        //this.unbind() //i'm not sure if unbinding will remove the index buffer from its vao
    }

}

export abstract class VertexAttributeBuffer extends Buffer<Float32Array>{
    public get_bind_target(): BindTarget{
        return BindTarget.ARRAY_BUFFER
    }

    protected vertexAttribPointer({vao, location, byteOffset=0, normalize, numComponents, elementType}:{
        vao: VertexArrayObject,
        location: AttributeLocation,
        byteOffset?: number,
        normalize: boolean,
        numComponents: AttributeNumComponents,
        elementType: AttributeElementType
    }){
        vao.bind();
        this.gl.enableVertexAttribArray(location.raw);
        this.bind()
        this.gl.vertexAttribPointer(
            /*index=*/location.raw,
            /*size=*/numComponents,
            /*type=*/elementType,
            /*normalize=*/normalize,
            /*stride=*/0,
            /*offset=*/byteOffset
        )
        this.unbind()
    }
}


export class Vec3AttributeBuffer extends VertexAttributeBuffer{
    public useWithAttribute({vao, location}:{
        vao: VertexArrayObject,
        location: AttributeLocation,
    }){
        this.vertexAttribPointer({vao, location, numComponents: 3, elementType: AttributeElementType.FLOAT, normalize: false})
    }
}

export class VertexIndicesBuffer extends Buffer<Uint16Array>{
    public readonly num_indices: number
    constructor(
        gl: WebGL2RenderingContext,
        data: Uint16Array,
        usageHint: BufferUsageHint,
        name="",
    ){
        super(gl, data, usageHint, name)
        this.num_indices = data.length
    }

    public get_bind_target(): BindTarget{
        return BindTarget.ELEMENT_ARRAY_BUFFER
    }
}