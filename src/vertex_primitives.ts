import { vec3 } from "gl-matrix";
import { FrontFace } from "./gl";

export enum DrawingMode{
    POINTS = WebGL2RenderingContext.POINTS,
    TRIANGLES = WebGL2RenderingContext.TRIANGLES,
    TRIANGLE_STRIP = WebGL2RenderingContext.TRIANGLE_STRIP,
}

export class VertexArray{
    public readonly data: Float32Array
    public readonly numVerts: number
    constructor(arr: Float32Array){
        if(arr.length % 3){
            throw `Bad array length when creating VertexArray: ${arr.length}`
        }
        this.data = arr
        this.numVerts = arr.length / 3
    }

    public getVertRef(index: number) : vec3{
        return this.data.subarray((index * 3), (index + 1) * 3)
    }
}

function getNormal(out: vec3, verts: Float32Array, vertexOrder: FrontFace = FrontFace.CCW): vec3{
    if(verts.length != 3*3){
        throw `Bad verts array length: ${verts.length}`
    }
    let v0 = verts.subarray(0, 3)
    let v1 = verts.subarray(3, 6)
    let v2 = verts.subarray(6, 9)

    let a = vec3.create(); vec3.sub(a, v1, v0)
    let b = vec3.create(); vec3.sub(a, v2, v0)
    if(vertexOrder == FrontFace.CCW){
        vec3.cross(out, a, b)
    }else{
        vec3.cross(out, b, a)
    }
    vec3.normalize(out, out)
    return out
}

export class Triangle extends VertexArray{
    //FIXME: allow cw verts?
    public readonly vertexOrder: FrontFace
    constructor(data: Float32Array, vertexOrder: FrontFace = FrontFace.CCW){
        if(data.length != 3 * 3){
            throw `Expected triangle buffer to have 9 floats and not ${data.length}`
        }
        super(data)
        this.vertexOrder = vertexOrder
    }

    public static fromVerts(p0: vec3, p1: vec3, p2: vec3, frontFace: FrontFace = FrontFace.CCW): Triangle{
        let arr : Float32Array
        if(frontFace == FrontFace.CCW){
            arr = new Float32Array([...p0, ...p1, ...p2])
        }else{
            arr = new Float32Array([...p2, ...p1, ...p0])
        }
        return new Triangle(arr)
    }

    public get p0(): vec3{
        return this.getVertRef(0)
    }

    public get p1(): vec3{
        return this.getVertRef(1)
    }

    public get p2(): vec3{
        return this.getVertRef(2)
    }

    public move(delta: vec3) : Triangle{
        vec3.add(this.p0, this.p0, delta)
        vec3.add(this.p1, this.p1, delta)
        vec3.add(this.p2, this.p2, delta)
        return this
    }

    public get_normal() : vec3{
        let normal = vec3.create();
        return getNormal(normal, this.data, this.vertexOrder)
    }
}

export abstract class VertexPrimitive extends VertexArray{
    public abstract getDrawingMode() : DrawingMode;
    public abstract getNormals(frontFace: FrontFace): Float32Array
}

export class TriangleArray extends VertexArray{
    public readonly vertexOrder: FrontFace
    public readonly numTriangles: number

    constructor(arr: Float32Array, vertexOrder: FrontFace = FrontFace.CCW){
        if(arr.length % (3 * 3) != 0){
            throw `Trying to create a triangle strip with array of ${arr.length} floats`
        }
        super(arr)
        this.vertexOrder = vertexOrder
        this.numTriangles = this.numVerts / 3
    }


    public static fromIndividualTriangles(individualTriangles: Array<Triangle>, vertexOrder: FrontFace = FrontFace.CCW): TriangleArray{
        let arr = new Float32Array(individualTriangles[0].data.length * individualTriangles.length)
        let tri_array = new TriangleArray(arr, vertexOrder)
        individualTriangles.forEach((tri, index) => {
            arr.set(tri.data, tri.data.length * index)
        })
        return tri_array
    }

    public getDrawingMode(): DrawingMode{
        return DrawingMode.TRIANGLES
    }

    public getNormals() : Float32Array{
        let out = new Float32Array(this.numTriangles * 3)
        for(let i=0; i<this.numTriangles; i++){
            getNormal(
                out.subarray(i*3, (i+1) * 3),
                this.data.subarray(i * 9, (i+1) * 9),
                this.vertexOrder
            )
        }
        return out
    }
}

export class TriangleStrip extends VertexPrimitive{
    public readonly vertexOrder: FrontFace
    public readonly numTriangles: number
    constructor(arr: Float32Array, vertexOrder: FrontFace = FrontFace.CCW){
        if(arr.length < 3 * 3){
            throw `Trying to create a triangle strip with array of ${arr.length} floats`
        }
        super(arr)
        this.vertexOrder = vertexOrder
        this.numTriangles = this.numVerts - 2 //first tri has 3 verts, every subsequent tri has only 1
    }
    public getDrawingMode() : DrawingMode{
        return DrawingMode.TRIANGLE_STRIP
    }
    public getNormals(): Float32Array{
        throw "Not implemented!"
    }
}

export class LineStrip extends VertexArray{
    constructor(arr: Float32Array){
        if(arr.length < 3 * 2){
            throw `Trying to create a line strip with array of ${arr.length} floats`
        }
        super(arr)
    }
}