import {vec3, quat, mat4} from "gl-matrix";

import {StandardVAO} from "./standard_shader";


//right-handed system
const RIGHT =  vec3.fromValues(1, 0, 0); // X
const UP    =  vec3.fromValues(0, 1, 0); // Y
const FRONT =  vec3.fromValues(0, 0, 1); // Z

const LEFT = vec3.create(); vec3.negate(LEFT, RIGHT);
const DOWN = vec3.create(); vec3.negate(DOWN,    UP);
const BACK = vec3.create(); vec3.negate(BACK, FRONT);


//front face corners
const LUF = vec3.create(); vec3.add(LUF,  LEFT,   UP); vec3.add(LUF, LUF, FRONT)
const LDF = vec3.create(); vec3.add(LDF,  LEFT, DOWN); vec3.add(LDF, LDF, FRONT)
const RDF = vec3.create(); vec3.add(RDF, RIGHT, DOWN); vec3.add(RDF, RDF, FRONT)
const RUF = vec3.create(); vec3.add(RUF, RIGHT,   UP); vec3.add(RUF, RUF, FRONT)


//back face corners
const LUB = vec3.create(); vec3.add(LUB, LEFT,    UP); vec3.add(LUB, LUB, BACK);
const LDB = vec3.create(); vec3.add(LDB, LEFT,  DOWN); vec3.add(LDB, LDB, BACK);
const RDB = vec3.create(); vec3.add(RDB, RIGHT, DOWN); vec3.add(RDB, RDB, BACK);
const RUB = vec3.create(); vec3.add(RUB, RIGHT,   UP); vec3.add(RUB, RUB, BACK);


function vecs_to_floats(vecs: Array<vec3>): Array<number>{
    let out = new Array<number>()
    for(let v of vecs){
        out.push(v[0]); out.push(v[1]); out.push(v[2]);
    }
    return out
}


export class Triangle{
    p0: vec3
    p1: vec3
    p2: vec3

    //points assumed to be counter-clockwise, unless clowckwise is true
    constructor(p0: vec3, p1: vec3, p2: vec3, clockwise=false){
        this.p0 = vec3.clone(p0);
        this.p1 = vec3.clone(p1)
        this.p2 = vec3.clone(p2)
        if(clockwise){
            this.p0 = p2
            this.p2 = p0
        }
    }

    public move(delta: vec3) : Triangle{
        vec3.add(this.p0, this.p0, delta)
        vec3.add(this.p1, this.p1, delta)
        vec3.add(this.p2, this.p2, delta)

        return this
    }

    public get_gl_positions() : Array<number>{
        return vecs_to_floats([this.p0, this.p1, this.p2])
    }

    public get_normal() : vec3{
        let v1 = vec3.create(); vec3.sub(v1, this.p1, this.p0)
        let v2 = vec3.create(); vec3.sub(v2, this.p2, this.p0)
        let normal = vec3.create(); vec3.cross(normal, v1, v2); vec3.normalize(normal, normal)
        return normal
    }

    public static CubeFrontBottom(): Triangle{
        return new Triangle(LUF, LDF, RDF);
    }

    public static CubeFrontTop(): Triangle{
        return new Triangle(LUF, RDF, RUF);
    }

    public static CubeLeftBottom(): Triangle{
        return new Triangle(LUF, LDF, LDB, true);
    }

    public static CubeLeftTop(): Triangle{
        return new Triangle(LUB, LUF, LDB, true)
    }

    public static CubeBackBottom(): Triangle{
        return new Triangle(LUB, LDB, RDB, true);
    }

    public static CubeBackTop(): Triangle{
        return new Triangle(LUB, RDB, RUB, true);
    }

    public static CubeRightBottom(): Triangle{
        return new Triangle(RUF, RDF, RDB);
    }

    public static CubeRightTop(): Triangle{
        return new Triangle(RUB, RUF, RDB);
    }
}

export class Mesh{
    constructor(public readonly triangles: Array<Triangle>){}

    public get_gl_positions() : Float32Array{
        let positions = new Array<number>()
        for(let t of this.triangles){
            let triangle_positions = t.get_gl_positions()
            positions = positions.concat(triangle_positions)
        }
        return new Float32Array(positions)
    }

    public get_gl_sharp_vert_normals(): Float32Array{
        let normals = new Array<number>()
        for(let t of this.triangles){
            let triangle_normal = t.get_normal();
            normals = normals.concat(vecs_to_floats([triangle_normal, triangle_normal, triangle_normal]))
        }
        return new Float32Array(normals)
    }
}


export interface MeshParams{
    gl: WebGL2RenderingContext,
    position?: vec3,
    scale?: vec3,
    rotation?: quat,
}

export class MeshObject{
    public readonly gl: WebGL2RenderingContext

    public position: vec3 //protecte with accessor?
    public scale: vec3
    protected rotation: quat

    public readonly vao: StandardVAO;
    
    constructor({
        gl,
        position=vec3.fromValues(0,0,0),
        scale=vec3.fromValues(1,1,1),
        rotation=quat.create()
    }: MeshParams,
    mesh: Mesh){
        this.gl = gl
        this.position = position
        this.scale = scale
        this.rotation = rotation

        this.vao = new StandardVAO({
            gl: gl,
            a_position_data: mesh.get_gl_positions(),
            a_normal_data: mesh.get_gl_sharp_vert_normals(),
        })
    }

    public rotateY(angle: number){
        quat.rotateY(this.rotation, this.rotation, angle)
    }

    public get object_to_world_matrix(): mat4{
        let out = mat4.create();
        mat4.fromRotationTranslationScale(out, this.rotation, this.position, this.scale)
        return out
    }
}

export class Cube extends MeshObject{
    constructor(params: MeshParams){
        super(params, new Mesh([
            Triangle.CubeFrontBottom(),
            Triangle.CubeFrontTop(),

            Triangle.CubeLeftBottom(),
            Triangle.CubeLeftTop(),

            Triangle.CubeBackBottom(),
            Triangle.CubeBackTop(),

            Triangle.CubeRightBottom(),
            Triangle.CubeRightTop(),
        ]))
    }
}


export class Plane extends MeshObject{
    constructor(params: MeshParams, location: vec3){
        super(params, new Mesh([
            Triangle.CubeFrontBottom().move(vec3.fromValues(0, 0, -1)).move(location),
            Triangle.CubeFrontTop().move(vec3.fromValues(0, 0, -1)).move(location),
        ]))
    }
}