import { extensionName } from './index.js';
import { eventSource } from '../../../../script.js';

const NO_CAPTURES = '';
const generationMutexEvents = {
    MUTEX_CAPTURED: 'GENERATION_MUTEX_CAPTURED',
    MUTEX_RELEASED: 'GENERATION_MUTEX_RELEASED',
};
/**
 * @typedef {object} GenerationMutexEvent
 * @property {string} extension_name - the name of the extension that captures the mutex
 */

let capturedBy = NO_CAPTURES;

/**
 * Flag indicating that the final reply generation is in progress.
 * Used by prompt_adjustment.js to know when to apply the final reply system prompt override.
 * @type {boolean}
 */
let _isFinalReplyGenerating = false;

/**
 * Flag indicating that a thinking step generation is in progress.
 * Used by prompt_adjustment.js to know when to apply the step system prompt override.
 * @type {boolean}
 */
let _isThinkingStepGenerating = false;

/**
 * @return {boolean}
 */
export function isFinalReplyGenerating() {
    return _isFinalReplyGenerating;
}

/**
 * @param {boolean} value
 * @return {void}
 */
export function setFinalReplyGenerating(value) {
    _isFinalReplyGenerating = value;
}

/**
 * @return {boolean}
 */
export function isThinkingStepGenerating() {
    return _isThinkingStepGenerating;
}

/**
 * @param {boolean} value
 * @return {void}
 */
export function setThinkingStepGenerating(value) {
    _isThinkingStepGenerating = value;
}

/**
 * @return {void}
 */
export function registerGenerationMutexListeners() {
    eventSource.on(generationMutexEvents.MUTEX_CAPTURED, onGenerationMutexCaptured);
    eventSource.on(generationMutexEvents.MUTEX_RELEASED, onGenerationMutexReleased);
}

/**
 * @return {boolean}
 */
export async function generationCaptured() {
    if (capturedBy === extensionName) {
        return true;
    }

    if (capturedBy === NO_CAPTURES) {
        await eventSource.emit(generationMutexEvents.MUTEX_CAPTURED, {extension_name: extensionName});
        return true;
    }

    return false;
}

/**
 * @return {void}
 */
export async function releaseGeneration() {
    await eventSource.emit(generationMutexEvents.MUTEX_RELEASED);
}

/**
 * @param {GenerationMutexEvent} event
 * @return {void}
 */
function onGenerationMutexCaptured(event) {
    capturedBy = event.extension_name;
    console.log('[Stepped Thinking] Generation mutex captured by', capturedBy);
}

/**
 * @return {void}
 */
function onGenerationMutexReleased() {
    capturedBy = NO_CAPTURES;
    console.log('[Stepped Thinking] Generation mutex released');
}
