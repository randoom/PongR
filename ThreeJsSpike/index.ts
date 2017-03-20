class GameWorld {
    private static readonly padWidth = 1.5;
    private static readonly padHeight = 1;
    private static readonly padDepth = 0.2;
    private static readonly fieldWidth = 6;
    private static readonly fieldHeight = 5;
    private static readonly fieldDepth = 20.2;
    private static readonly ballR = 0.1;

    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private textureloader: THREE.TextureLoader;

    private pad1: THREE.Mesh;
    private pad2: THREE.Mesh;
    private ball: DynamicMesh;
    private padPosition: THREE.Vector3;

    public initializeScene(canvasWidth: number, canvasHeight: number): HTMLElement {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, precision: "highp" });
        this.renderer.setClearColor(0x000000, 1);
        this.renderer.setSize(canvasWidth, canvasHeight);
        this.renderer.autoClear = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, canvasWidth / canvasHeight, 0.1, 100);
        this.camera.position.set(0, 0, 17);
        this.camera.lookAt(this.scene.position);
        this.scene.add(this.camera);

        this.textureloader = new THREE.TextureLoader();

        this.addLights();

        let field = this.createField();
        this.scene.add(field);

        this.pad1 = this.createPad();
        this.pad1.position.set(0.0, 0.0, 10.0);
        this.scene.add(this.pad1);

        this.pad2 = this.createPad();
        this.pad2.position.set(0.0, 0.0, -10.0);
        this.scene.add(this.pad2);

        this.ball = this.createBall();
        this.ball.position.set(0.0, 0.0, 0.0);
        this.scene.add(this.ball);

        window.addEventListener("mousemove", e => this.onMouseMove(e), false);
        window.addEventListener("resize", e => this.onResize(e), false);

        return this.renderer.domElement;
    }

    private createField(): THREE.Mesh {
        let geometry = new THREE.BoxGeometry(GameWorld.fieldWidth, GameWorld.fieldHeight, GameWorld.fieldDepth);

        // remove front and back quads
        geometry.faces.splice(8, 4);
        geometry.elementsNeedUpdate = true;

        let material = new THREE.MeshStandardMaterial({
            color: 0xaaffaa,
            side: THREE.BackSide,
            roughness: 1,
            metalness: 0
        });

        let mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        return mesh;
    }

    private createPad(): THREE.Mesh {
        let geometry = new THREE.BoxGeometry(GameWorld.padWidth, GameWorld.padHeight, GameWorld.padDepth);
        let material = new THREE.MeshStandardMaterial({
            color: 0x33ff77,
            transparent: true,
            opacity: 0.80,
            roughness: 0.5,
            metalness: 0.5
        });
        let mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = false;
        return mesh;
    }

    private createBall(): DynamicMesh {
        let geometry = new THREE.SphereGeometry(GameWorld.ballR, 8);
        let material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.0,
            emissive: new THREE.Color(0x777777)
        });

        this.textureloader.load("assets/ball.png", (texture: THREE.Texture) => {
            material.map = texture;
            material.emissiveMap = texture;
            material.needsUpdate = true;
        });

        let mesh: DynamicMesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        mesh.speed = new THREE.Vector3(3, 3, 3);

        return mesh;
    }

    private addLights(): void {
        let distance = 9;

        let ambient = new THREE.AmbientLight(0x111111);
        this.scene.add(ambient);

        let lightLeft = this.createSpotLight();
        lightLeft.position.set(-distance, 0, 0);
        this.scene.add(lightLeft);

        let lightRight = this.createSpotLight();
        lightRight.position.set(distance, 0, 0);
        this.scene.add(lightRight);

        let lightTop = this.createSpotLight();
        lightTop.position.set(0, distance, 0);
        this.scene.add(lightTop);

        let lightBottom = this.createSpotLight();
        lightBottom.position.set(0, -distance, 0);
        this.scene.add(lightBottom);

        let lightFront = this.createSpotLight();
        lightFront.position.set(0, 0, 2 * distance);
        lightFront.castShadow = false;
        this.scene.add(lightFront);
    }

    private createSpotLight(): THREE.SpotLight {
        let light = new THREE.SpotLight(0x333333);
        light.castShadow = true;
        //light.intensity = 1;
        //light.shadow.bias = 0.0001;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        return light;
    }

    private onMouseMove(event: MouseEvent): void {
        this.padPosition = this.screenToScene(event.offsetX, event.offsetY, window.innerWidth, window.innerHeight, this.pad1.position.z);
    }

    private onResize(event: UIEvent): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private screenToScene(screenX: number, screenY: number, screenWidth: number, screenHeight: number, sceneZ: number): THREE.Vector3 {
        let vector = new THREE.Vector3();
        vector.set(screenX / screenWidth * 2 - 1, -screenY / screenHeight * 2 + 1, 0.5);
        vector.unproject(this.camera);

        let dir = vector.sub(this.camera.position).normalize();
        let distance = (sceneZ - this.camera.position.z) / dir.z;

        return this.camera.position.clone().add(dir.multiplyScalar(distance));
    }

    private lastTime: number;
    private animateScene(time: number): void {
        let dt = this.lastTime ? time - this.lastTime : 1 / 60;
        this.lastTime = time;

        this.updateScene(dt / 1000);

        if (this.padPosition) {
            this.pad1.position.x = this.centerClip(this.padPosition.x, GameWorld.fieldWidth - GameWorld.padWidth);
            this.pad1.position.y = this.centerClip(this.padPosition.y, GameWorld.fieldHeight - GameWorld.padHeight);
        }

        requestAnimationFrame((t: number) => this.animateScene(t));

        this.renderer.render(this.scene, this.camera);
    }

    private updateScene(dt: number): void {
        this.updateBall(dt);
    }

    private updateBall(dt: number): void {
        this.ball.position.x += this.ball.speed.x * dt;
        this.ball.position.y += this.ball.speed.y * dt;
        this.ball.position.z += this.ball.speed.z * dt;

        /*
        if (this.ball.position.x <= minX) {
            if (this.ball.position.y >= this.this.pad1.y && this.ball.position.y <= this.this.pad1.y + this.this.pad1.height) {
                this.ball.position.x = 2 * minX - this.ball.position.x;
                this.ball.speed.x = -this.ball.speed.x;
            } else {
                //this.pointStarted = false;
                //hub.server.missedBall();
            }
        }
    
        if (this.ball.position.x >= maxX) {
            if (this.ball.position.y >= this.this.pad2.y && this.ball.position.y <= this.this.pad2.y + this.this.pad2.height) {
                this.ball.position.x = 2 * maxX - this.ball.position.x;
                this.ball.speed.x = -this.ball.speed.x;
            }
        }
        */

        let minX = GameWorld.fieldWidth / 2 - GameWorld.ballR;
        let minY = GameWorld.fieldHeight / 2 - GameWorld.ballR;
        let minZ = GameWorld.fieldDepth / 2 - GameWorld.ballR;

        if (this.ball.position.x <= -minX) {
            this.ball.position.x = 2 * -minX - this.ball.position.x;
            this.ball.speed.x = -this.ball.speed.x;
        }

        if (this.ball.position.x >= minX) {
            this.ball.position.x = 2 * minX - this.ball.position.x;
            this.ball.speed.x = -this.ball.speed.x;
        }

        if (this.ball.position.y <= -minY) {
            this.ball.position.y = 2 * -minY - this.ball.position.y;
            this.ball.speed.y = -this.ball.speed.y;
        }

        if (this.ball.position.y >= minY) {
            this.ball.position.y = 2 * minY - this.ball.position.y;
            this.ball.speed.y = -this.ball.speed.y;
        }

        if (this.ball.position.z <= -minZ) {
            this.ball.position.z = 2 * -minZ - this.ball.position.z;
            this.ball.speed.z = -this.ball.speed.z;
        }

        if (this.ball.position.z >= minZ) {
            this.ball.position.z = 2 * minZ - this.ball.position.z;
            this.ball.speed.z = -this.ball.speed.z;
        }
    }

    private centerClip(val: number, len: number): number {
        return Math.min(Math.max(val, -len / 2), len / 2);
    }
}

class DynamicMesh extends THREE.Mesh {
    public speed?: THREE.Vector3;
}
