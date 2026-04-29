# 📊 LearnPhilosophy Evals: Golden Dataset

Este archivo contiene el conjunto de preguntas "doradas" para evaluar la calidad de las respuestas de la IA. Se utiliza para medir si los cambios en el prompt o el modelo mejoran o empeoran la experiencia educativa.

## 🎯 Criterios de Evaluación
1. **Precisión Filosófica**: ¿Menciona los autores y conceptos correctos?
2. **Nivel Educativo**: ¿Es el lenguaje apropiado para secundaria/bachillerato (ni muy simple, ni muy académico)?
3. **Uso de Fuentes (RAG)**: ¿Se basa en el contenido del archivo .md correspondiente?
4. **Continuidad**: ¿Mantiene el hilo de la conversación en seguimientos?

## 📚 Golden Questions

| Tópico | Pregunta | Respuesta Esperada (Key Points) |
| :--- | :--- | :--- |
| **Kant** | ¿Qué es el imperativo categórico? | Debe mencionar actuar según leyes universales, la diferencia con imperativos hipotéticos y no usar a las personas como medios. |
| **Estoicismo** | ¿Cómo manejan el dolor los estoicos? | Control de lo interno vs externo, la dicotomía del control y la aceptación de la naturaleza. |
| **Platón** | Explícame el mito de la caverna. | Sombras como falsa realidad, el ascenso al sol (conocimiento/Idea del Bien) y el retorno del filósofo. |
| **Ética** | ¿Qué es más importante, la intención o el resultado? | Comparación entre Deontología (Kant) y Utilitarianismo (Mill). |
| **Nietzsche** | ¿Qué significa que 'Dios ha muerto'? | Pérdida de la base moral tradicional, nihilismo y la necesidad de crear nuevos valores. |

## 🔄 Proceso de Testing
1. Realizar la pregunta en la app.
2. Comparar la respuesta con los "Key Points".
3. Puntuar del 1 al 5 en cada criterio.
