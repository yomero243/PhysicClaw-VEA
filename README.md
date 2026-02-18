# PhysicClaw-VEA

**PhysicClaw-VEA** es una aplicación de visualización 3D interactiva construida con tecnologías web modernas. Presenta una "Entidad Aumentada" que reacciona dinámicamente a estados internos simulados (pensamiento, emociones) a través de shaders personalizados y animaciones.

## 🚀 Características Principales

-   **Visualización 3D Avanzada**: Utiliza **React Three Fiber** y **Three.js** para renderizar una escena inmersiva.
-   **Shaders Reactivos**: Implementación de `EnergyShader` que modifica visualmente la entidad basándose en propiedades como intensidad, "pensamiento" y estado de ánimo.
-   **Sistema "Soul" (Alma)**: Gestión de estado global con **Zustand** para simular comportamientos de la entidad (e.g., `isThinking`, `mood`, `intensity`).
-   **Interfaz de Chat**: Componente de interfaz superpuesto para interacción.
-   **Soporte de Modelos GLB**: Capacidad para cargar modelos 3D externos con animaciones, con un fallback elegante a una geometría base procedural.

## 🛠️ Tecnologías Utilizadas

-   [Vite](https://vitejs.dev/)
-   [React](https://react.dev/) (v19)
-   [TypeScript](https://www.typescriptlang.org/)
-   [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
-   [Zustand](https://zustand-demo.pmnd.rs/)

## 📦 Instalación y Uso

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```

2.  **Iniciar servidor de desarrollo**:
    ```bash
    npm run dev
    ```

3.  **Construir para producción**:
    ```bash
    npm run build
    ```

## 📂 Estructura del Proyecto

-   `src/components`: Componentes de React y R3F (e.g., `Experience`, `AugmentedEntity`, `ChatInterface`).
-   `src/shaders`: Definiciones de shaders personalizados (GLSL/TS).
-   `src/store`: Lógica de estado global (`soulStore`).
