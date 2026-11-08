// Entry point of the PSP container in docker runtime: listens on port 7070.
import { createPspServer } from './psp.mjs';

createPspServer().listen(7070, '0.0.0.0', () => console.log('psp listening on 7070'));
