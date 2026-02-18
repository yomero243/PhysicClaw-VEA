# PhysicClaw-VEA

**PhysicClaw-VEA** is an interactive 3D visualization application built with modern web technologies. It features an "Augmented Entity" that reacts dynamically to simulated internal states (thinking, emotions) through custom shaders and animations.

## 🚀 Key Features

-   **Advanced 3D Visualization**: Utilizes **React Three Fiber** and **Three.js** to render an immersive scene.
-   **Reactive Shaders**: Implementation of `EnergyShader` that visually modifies the entity based on properties like intensity, "thinking", and mood.
-   **"Soul" System**: Global state management with **Zustand** to simulate entity behaviors (e.g., `isThinking`, `mood`, `intensity`).
-   **Chat Interface**: Overlay interface component for interaction.
-   **GLB Model Support**: Capability to load external 3D models with animations, with elegant fallback to procedural base geometry.
-   **FBX Character Loader**: Includes support for animated FBX characters (`MyCharacter` component).

## 🛠️ Technologies Used

-   [Vite](https://vitejs.dev/)
-   [React](https://react.dev/) (v19)
-   [TypeScript](https://www.typescriptlang.org/)
-   [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
-   [Zustand](https://zustand-demo.pmnd.rs/)

## 📦 Installation and Usage

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start development server**:
    ```bash
    npm run dev
    ```

3.  **Build for production**:
    ```bash
    npm run build
    ```

## 📂 Project Structure

-   `src/components`: React and R3F components (e.g., `Experience`, `AugmentedEntity`, `ChatInterface`, `MyCharacter`).
-   `src/shaders`: Custom shader definitions (GLSL/TS).
-   `src/store`: Global state logic (`soulStore`).
