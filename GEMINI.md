# PhysicClaw-VEA — Guía de Contexto (GEMINI.md)

Este archivo proporciona contexto esencial sobre la arquitectura, tecnologías y convenciones del proyecto PhysicClaw-VEA.

## 🚀 Resumen del Proyecto

**PhysicClaw-VEA** es una aplicación interactiva de visualización 3D que presenta una "Entidad Virtual Aumentada" (VEA). La entidad reacciona dinámicamente a estados internos simulados (pensamiento, emociones) a través de shaders personalizados, animaciones y conversación con IA en tiempo real.

### Tecnologías Clave
- **Frontend:** React 19, TypeScript, Vite.
- **Renderizado 3D:** Three.js, React Three Fiber (R3F), React Three Drei.
- **Estado Global:** Zustand (con persistencia).
- **Backend/Infraestructura:** Supabase (Auth, Realtime, Database, Storage).
- **IA:** Integración con API de OpenClaw (por defecto Gemini 2.5 Flash).
- **Shaders:** GLSL (EnergyShader personalizado).
- **Testing:** Vitest.

---

## 🛠️ Comandos de Desarrollo

| Acción | Comando |
| :--- | :--- |
| Instalar dependencias | `npm install` |
| Iniciar servidor de desarrollo | `npm run dev` |
| Construir para producción | `npm run build` |
| Ejecutar pruebas (Vitest) | `npm run test` |
| Verificar tipos (TypeScript) | `npm run typecheck` |
| Linting y formateo | `npm run lint` / `npm run format` |
| Verificar entorno | `npm run verify-env` |

---

## 📂 Estructura del Proyecto

- `src/components/`: Componentes de UI y R3F.
    - `Experience.tsx`: Raíz de la escena R3F (cámara, luces, entorno).
    - `DynamicCharacter.tsx`: Renderizador dinámico de modelos FBX/GLB y entidades base.
    - `ChatInterface.tsx`: Interfaz de chat con entrada de voz y selector de personajes.
- `src/store/`: Gestión de estado con Zustand.
    - `soulStore.ts`: El "alma" de la entidad (humor, intensidad, mensajes, configuración de API).
    - `sceneStore.ts`: Estado de la escena y objetos persistentes en la BD.
- `src/shaders/`: Shaders personalizados en GLSL (ej. `EnergyShader.ts`).
- `src/services/`: Clientes de API y servicios externos (ej. `openClawService.ts`).
- `src/hooks/`: Hooks personalizados para lógica reutilizable (multiplayer, control externo, etc.).
- `supabase/`: Configuraciones de backend, migraciones y funciones Edge.

---

## 🧠 Sistema de "Alma" (Soul System)

El estado de la entidad se gestiona en `useSoulStore.ts` y controla visualmente el comportamiento:
- **Estados:** `isThinking`, `mood` (`calm`, `excited`, `thinking`, `listening`, etc.), `intensity`.
- **Mapeo de Colores:** Los humores se mapean a colores específicos en `MOOD_COLORS`.
- **Interacción:** Las respuestas de la IA actualizan el humor y la intensidad, lo que modifica el `EnergyShader` y las animaciones activas.

---

## 🔗 Control Externo (OpenClaw Control)

Existen dos formas de controlar la entidad desde el exterior:
1.  **Archivo Local:** Escribiendo en `openclaw-control.json` (vigilado por el plugin de Vite en desarrollo).
2.  **API HTTP:** Enviando un POST a `/api/control` (disponible en el servidor de desarrollo de Vite).

---

## 📜 Convenciones y Estándares

- **Tipado:** Uso estricto de TypeScript. Evitar `any`.
- **Estilos:** CSS puro (Vanilla CSS). Evitar frameworks de utilidad como Tailwind a menos que se solicite.
- **R3F Performance:** Utilizar constantes estáticas fuera de los componentes para vectores y colores para evitar recreación de memoria en cada frame.
- **Validación:** Uso de `zod` para validación de datos y esquemas.
- **Shaders:** Los materiales de shader deben extender `THREE.ShaderMaterial` o usar `shaderMaterial` de Drei.

---

## ⚠️ Notas de Seguridad

- Nunca expongas `VITE_OPENCLAW_TOKEN` o secretos de Supabase en el código fuente.
- Usa el archivo `.env.example` como plantilla para variables de entorno locales.
- El plugin de obfuscación solo se aplica en compilaciones de producción.
