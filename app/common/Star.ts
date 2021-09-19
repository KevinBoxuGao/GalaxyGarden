import * as THREE from 'three'
import { Rendered } from './component/Rendered';
import { Luminous } from './component/Luminous';
import { PointLight } from 'three';
import { makeNoise3D } from 'open-simplex-noise';
import { fractalNoise3D_Spherical } from './noise';

export class Star implements Rendered, Luminous {
    /** 
     * Stores information about the solar system’s star.
     */
    mesh: THREE.Mesh;
    radius: number;
    luminosity: number;
    color: THREE.Color;

    light: THREE.PointLight;
    position: THREE.Vector3;

    tex_w: number;
    tex_h: number;

    // Initialized in subclasses
    max_elevation: number = -Infinity;
    min_elevation: number = Infinity;
    elevations: Float64Array;
    normalMap: THREE.Texture; // TODO generate
    tex: THREE.Texture;
    palette: Array<THREE.Color> = [];
    height_thresholds: Array<number> = [];

    constructor(radius: number, luminosity: number, color: THREE.Vector3, position: THREE.Vector3, scene: THREE.Scene, seed: number) {
        color = color.divideScalar(255);
        this.color = new THREE.Color(color.x, color.y, color.z);
        this.radius = radius;
        this.tex_w = radius*6; // Approximate pi = 3
        this.tex_h = this.tex_w/2;
        this.mesh = this.generateMesh(seed);
        scene.add( this.mesh );

        this.luminosity = luminosity;

        this.light = new PointLight(this.color, 1, 10000);
        this.position = position;
        this.light.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        scene.add( this.light );
        
    }

    generateMesh(seed: number): THREE.Mesh {
        this.elevations = this.generateElevations(seed);
        this.tex = this.generateTexture(seed);
        
        const geometry = new THREE.SphereGeometry(this.radius); // TODO params
        const material = new THREE.MeshBasicMaterial({
            map: this.tex
            //normalMap: this.normalMap
        });

        return new THREE.Mesh(geometry, material);
    }

    generateElevations(seed: number): Float64Array {
        // Generate elevations
        let elevations = new Float64Array(this.tex_w*this.tex_h);
        const noise = makeNoise3D(seed);
        let r_sphere = this.tex_w/(2*Math.PI);
        for (let y = 0.5; y < this.tex_h; ++y) {
            let theta = y*Math.PI/this.tex_h;
            let r_cylinder = r_sphere*Math.cos(Math.PI/2 - theta);
            for (let x = 0.5; x < this.tex_w; ++x) {
                let phi = x*2*Math.PI/this.tex_w;
                let noiseOut = fractalNoise3D_Spherical(theta, phi, r_cylinder, 0.005*this.tex_w/100, noise, 4, 2, 0.4);

                elevations[(y - 0.5)*this.tex_w + (x - 0.5)] = noiseOut;

                this.min_elevation = Math.min(this.min_elevation, noiseOut);
                this.max_elevation = Math.max(this.max_elevation, noiseOut);
            }
        }
        return elevations;
    }
    
    generateTexture(seed?: number): THREE.Texture {
        // Generate texture
        let texData = new Uint8Array(this.tex_w*this.tex_h*3);

        for (let y = 0; y < this.tex_h; ++y) {
            for (let x = 0; x < this.tex_w; ++x) {
                let elevation = this.elevations[y*this.tex_w + x];

                texData[3*y*this.tex_w + 3*x + 0] = Math.floor(elevation*255); // TODO add colours
                texData[3*y*this.tex_w + 3*x + 1] = Math.floor(elevation*160);
                texData[3*y*this.tex_w + 3*x + 2] = Math.floor(elevation*120);
            }
        }

        return new THREE.DataTexture(texData, this.tex_w, this.tex_h, THREE.RGBFormat);
    }

    update() {} // TODO
}