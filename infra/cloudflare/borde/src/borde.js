// Punto de entrada del Worker. Solo exporta el manejador: Workers trata cada export
// como un punto de entrada, así que la lógica vive en logica.js.
import { crearBorde } from './logica.js';

export default crearBorde();
