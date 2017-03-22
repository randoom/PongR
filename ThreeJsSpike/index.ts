class GameWorld {
    private static readonly padWidth = 1.5;
    private static readonly padHeight = 1;
    private static readonly padDepth = 0.2;
    private static readonly fieldWidth = 6;
    private static readonly fieldHeight = 5;
    private static readonly fieldDepth = 20.2;
    private static readonly ballRadius = 0.1;

    private physics: CANNON.World;

    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private textureloader: THREE.TextureLoader;

    private pad1: WorldObject;
    private pad2: WorldObject;
    private ball: WorldObject;
    private padPosition: THREE.Vector3;

    private jointBody: CANNON.Body;
    private mouseConstraint: CANNON.PointToPointConstraint;

    private fieldMaterial = new CANNON.Material("field");
    private ballMaterial = new CANNON.Material("ball");
    private padMaterial = new CANNON.Material("pad");

    constructor() {
        this.ballMaterial.friction = 0.5;
        this.fieldMaterial.friction = 0.2;
        this.padMaterial.friction = 1.0;

        this.fieldMaterial.restitution = 1;
        this.ballMaterial.restitution = 1;
        this.padMaterial.restitution = 1;
    }

    public initializeScene(canvasWidth: number, canvasHeight: number): HTMLElement {

        this.physics = new CANNON.World();
        // set gravity to workaround an issue where no friction is computed when gravity is 0
        // see https://github.com/schteppe/cannon.js/issues/224
        this.physics.gravity.set(0, -10, 0);
        this.physics.broadphase = new CANNON.NaiveBroadphase();
        this.physics.solver.iterations = 10;
        
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

        this.ball = this.addBall();
        this.ball.setPosition(0.0, 0.0, 0.0);

        this.addField();

        this.pad1 = this.addPad();
        this.pad1.setPosition(0.0, 0.0, 10.0);

        this.jointBody = new CANNON.Body({ mass: 0 });
        this.jointBody.addShape(new CANNON.Sphere(0.1));
        this.jointBody.collisionFilterGroup = 0;
        this.jointBody.collisionFilterMask = 0;
        this.jointBody.position.set(0.0, 0.0, 10.0);
        this.physics.addBody(this.jointBody);

        this.mouseConstraint = new CANNON.PointToPointConstraint(this.pad1.body, new CANNON.Vec3(0, 0, 0), this.jointBody, new CANNON.Vec3(0, 0, 0));
        this.physics.addConstraint(this.mouseConstraint);

        this.pad2 = this.addPad();
        this.pad2.setPosition(0.0, 0.0, -10.0);

        window.addEventListener("mousemove", e => this.onMouseMove(e), false);
        window.addEventListener("resize", e => this.onResize(e), false);

        return this.renderer.domElement;
    }

    private addField(): void {
        let planeBottom = this.addPlane(GameWorld.fieldWidth, GameWorld.fieldDepth);
        planeBottom.body.position.set(0, -GameWorld.fieldHeight / 2, 0);
        planeBottom.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        planeBottom.updateMesh();

        let planeTop = this.addPlane(GameWorld.fieldWidth, GameWorld.fieldDepth);
        planeTop.body.position.set(0, GameWorld.fieldHeight / 2, 0);
        planeTop.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        planeTop.updateMesh();

        let planeLeft = this.addPlane(GameWorld.fieldDepth, GameWorld.fieldHeight);
        planeLeft.body.position.set(-GameWorld.fieldWidth / 2, 0, 0);
        planeLeft.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
        planeLeft.updateMesh();

        let planeRight = this.addPlane(GameWorld.fieldDepth, GameWorld.fieldHeight);
        planeRight.body.position.set(GameWorld.fieldWidth / 2, 0, 0);
        planeRight.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
        planeRight.updateMesh();

        let planeBack = this.addPlane(GameWorld.fieldWidth, GameWorld.fieldHeight, false);
        planeBack.body.position.set(0, 0, -GameWorld.fieldDepth / 2);
        // planeBack.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), 0);

        let planeFront = this.addPlane(GameWorld.fieldWidth, GameWorld.fieldHeight, false);
        planeFront.body.position.set(0, 0, GameWorld.fieldDepth / 2);
        planeFront.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI);
    }

    private addPlane(width: number, height: number, hasMesh: boolean = true): WorldObject {

        let mesh = null;
        if (hasMesh) {
            let geometry = new THREE.PlaneGeometry(width, height);

            let material = new THREE.MeshStandardMaterial({
                color: 0xaaffaa,
                roughness: 1,
                metalness: 0,
                transparent: true,
                opacity: 0.80,
            });

            mesh = new THREE.Mesh(geometry, material);
            mesh.receiveShadow = true;
            mesh.castShadow = false;

            this.scene.add(mesh);
        }

        let body = new CANNON.Body({
            mass: 0
        });
        body.material = this.fieldMaterial;
        body.addShape(new CANNON.Plane());
        this.physics.addBody(body);

        return new WorldObject(mesh, body);
    }

    private addPad(): WorldObject {
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
        this.scene.add(mesh);

        let body = new CANNON.Body({
            mass: 10
        });
        body.fixedRotation = true;
        body.material = this.padMaterial;
        body.addShape(new CANNON.Box(new CANNON.Vec3(GameWorld.padWidth / 2, GameWorld.padHeight / 2, GameWorld.padDepth / 2)));
        this.physics.addBody(body);

        return new WorldObject(mesh, body);
    }

    private addBall(): WorldObject {
        let geometry = new THREE.SphereGeometry(GameWorld.ballRadius, 8);
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

        let mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        this.scene.add(mesh);

        let body = new CANNON.Body({
            mass: 1,
            velocity: new CANNON.Vec3(3, 0, 3)
        });
        body.angularVelocity.set(0, 10, 0);
        body.material = this.ballMaterial;
        body.addShape(new CANNON.Sphere(GameWorld.ballRadius));
        this.physics.addBody(body);

        return new WorldObject(mesh, body);
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
        this.padPosition = this.screenToScene(event.offsetX, event.offsetY, window.innerWidth, window.innerHeight, this.pad1.mesh.position.z);
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

        requestAnimationFrame((t: number) => this.animateScene(t));

        this.renderer.render(this.scene, this.camera);
    }

    private updateScene(dt: number): void {
        if (this.padPosition) {
            this.jointBody.position.set(this.padPosition.x, this.padPosition.y, this.jointBody.position.z);
            this.mouseConstraint.update();
        }

        // cancel gravity
        for (let i = 0; i < this.physics.bodies.length; i++) {
            let b = this.physics.bodies[i];
            if (b.type === CANNON.Body.DYNAMIC) {
                b.force.y -= b.mass * this.physics.gravity.y; // this will make the net gravity zero
            }
        }

        this.physics.step(dt);
        this.ball.updateMesh();
        this.pad1.updateMesh();
    }
}

class WorldObject {
    public mesh: THREE.Mesh;
    public body: CANNON.Body;

    constructor(mesh: THREE.Mesh, body: CANNON.Body) {
        this.mesh = mesh;
        this.body = body;
    }

    public setPosition(x: number, y: number, z: number): void {
        this.mesh.position.set(x, y, z);
        this.body.position.set(x, y, z);
    }

    public updateMesh(): void {
        if (this.mesh) {
            this.mesh.position.copy(<THREE.Vector3><{}>this.body.position);
            this.mesh.quaternion.copy(<THREE.Quaternion><{}>this.body.quaternion);
        }
    }
}
