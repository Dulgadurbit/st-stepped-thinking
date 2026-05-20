/**
 * Model Override Utilities for Stepped Thinking
 *
 * Provides temporary model swapping for per-step and final-reply model overrides.
 * Works by caching the current model setting, swapping to the override model,
 * and restoring the original after generation completes.
 *
 * CRITICAL: This only modifies the extension's view of the settings object.
 * It does NOT modify SillyTavern core files.
 */

import { getContext } from '../../../../extensions.js';
import { oai_settings, getChatCompletionModel, chat_completion_sources } from '../../../../openai.js';
import { textgenerationwebui_settings } from '../../../../textgen-settings.js';
import { settings } from '../settings/settings.js';

/**
 * Mapping from chat_completion_source to the oai_settings property name that holds the model.
 * Used to read/write the model for a given API source.
 */
const OAI_MODEL_PROPERTY_MAP = {
    [chat_completion_sources.OPENAI]: 'openai_model',
    [chat_completion_sources.CLAUDE]: 'claude_model',
    [chat_completion_sources.MAKERSUITE]: 'google_model',
    [chat_completion_sources.VERTEXAI]: 'vertexai_model',
    [chat_completion_sources.OPENROUTER]: 'openrouter_model',
    [chat_completion_sources.AI21]: 'ai21_model',
    [chat_completion_sources.MISTRALAI]: 'mistralai_model',
    [chat_completion_sources.CUSTOM]: 'custom_model',
    [chat_completion_sources.COHERE]: 'cohere_model',
    [chat_completion_sources.PERPLEXITY]: 'perplexity_model',
    [chat_completion_sources.GROQ]: 'groq_model',
    [chat_completion_sources.SILICONFLOW]: 'siliconflow_model',
    [chat_completion_sources.MINIMAX]: 'minimax_model',
    [chat_completion_sources.ELECTRONHUB]: 'electronhub_model',
    [chat_completion_sources.CHUTES]: 'chutes_model',
    [chat_completion_sources.NANOGPT]: 'nanogpt_model',
    [chat_completion_sources.DEEPSEEK]: 'deepseek_model',
    [chat_completion_sources.AIMLAPI]: 'aimlapi_model',
    [chat_completion_sources.XAI]: 'xai_model',
    [chat_completion_sources.POLLINATIONS]: 'pollinations_model',
    [chat_completion_sources.COMETAPI]: 'cometapi_model',
    [chat_completion_sources.MOONSHOT]: 'moonshot_model',
    [chat_completion_sources.FIREWORKS]: 'fireworks_model',
    [chat_completion_sources.AZURE_OPENAI]: 'azure_openai_model',
    [chat_completion_sources.ZAI]: 'zai_model',
    [chat_completion_sources.WORKERS_AI]: 'workers_ai_model',
};

/**
 * Mapping from textgen_types to the textgenerationwebui_settings property name that holds the model.
 */
const TEXTGEN_MODEL_PROPERTY_MAP = {
    // textgen_types values - these are set in textgen-settings.js
    'ooba': 'custom_model',
    'aphrodite': 'aphrodite_model',
    'exllamav2': 'custom_model',
    'llamacpp': 'llamacpp_model',
    'koboldcpp': 'custom_model',
    'tabby': 'tabby_model',
    'vllm': 'vllm_model',
    'mancer': 'mancer_model',
    'togetherai': 'togetherai_model',
    'infermaticai': 'infermaticai_model',
    'dreamgen': 'dreamgen_model',
    'openrouter': 'openrouter_model',
    'ollama': 'ollama_model',
    'featherless': 'featherless_model',
    'generic': 'generic_model',
};

/**
 * @typedef {object} ModelCache
 * @property {string} apiType - 'openai' or 'textgen' — which API family was active
 * @property {string} source - The specific source identifier (e.g., 'openai', 'claude', 'ooba')
 * @property {string} property - The property name on the settings object
 * @property {string} originalModel - The original model value that was cached
 */

/**
 * Caches the current model and swaps to the override model.
 *
 * @param {string} overrideModel - The model name to swap to
 * @return {?ModelCache} The cached model info for later restoration, or null if no swap was needed/possible
 */
export function swapModelTo(overrideModel) {
    if (!overrideModel || overrideModel.trim() === '') {
        return null;
    }

    const context = getContext();
    const mainApi = context.mainApi;

    if (mainApi === 'openai') {
        return swapOaiModel(overrideModel.trim());
    } else if (mainApi === 'textgenerationwebui') {
        return swapTextgenModel(overrideModel.trim());
    }

    // For other APIs (kobold, novel, etc.), model override is not supported
    console.warn(`[Stepped Thinking] Model override is not supported for API type: ${mainApi}`);
    return null;
}

/**
 * Restores the model from a previously cached value.
 *
 * @param {?ModelCache} cache - The cached model info from swapModelTo(), or null
 * @return {void}
 */
export function restoreModel(cache) {
    if (!cache) {
        return;
    }

    if (cache.apiType === 'openai') {
        oai_settings[cache.property] = cache.originalModel;
    } else if (cache.apiType === 'textgen') {
        textgenerationwebui_settings[cache.property] = cache.originalModel;
    }

    console.log(`[Stepped Thinking] Restored model to: ${cache.originalModel}`);
}

/**
 * Gets the current model name for the active API.
 *
 * @return {string} The current model name
 */
export function getCurrentModel() {
    const context = getContext();
    const mainApi = context.mainApi;

    if (mainApi === 'openai') {
        return getChatCompletionModel() || '';
    } else if (mainApi === 'textgenerationwebui') {
        return getTextGenModel() || '';
    }

    return '';
}

/**
 * Swaps the model for OpenAI/Chat Completion APIs.
 *
 * @param {string} overrideModel - The model name to swap to
 * @return {?ModelCache} The cached model info, or null if swap failed
 */
function swapOaiModel(overrideModel) {
    const source = oai_settings.chat_completion_source;
    const property = OAI_MODEL_PROPERTY_MAP[source];

    if (!property) {
        console.warn(`[Stepped Thinking] Unknown chat completion source: ${source}, cannot swap model`);
        return null;
    }

    const originalModel = oai_settings[property];
    oai_settings[property] = overrideModel;

    console.log(`[Stepped Thinking] Swapped OAI model from "${originalModel}" to "${overrideModel}" (source: ${source})`);

    return {
        apiType: 'openai',
        source: source,
        property: property,
        originalModel: originalModel,
    };
}

/**
 * Swaps the model for Text Generation APIs.
 *
 * @param {string} overrideModel - The model name to swap to
 * @return {?ModelCache} The cached model info, or null if swap failed
 */
function swapTextgenModel(overrideModel) {
    const textgenType = textgenerationwebui_settings.type;
    const property = TEXTGEN_MODEL_PROPERTY_MAP[textgenType];

    if (!property) {
        console.warn(`[Stepped Thinking] Unknown textgen type: ${textgenType}, cannot swap model`);
        return null;
    }

    const originalModel = textgenerationwebui_settings[property];
    textgenerationwebui_settings[property] = overrideModel;

    console.log(`[Stepped Thinking] Swapped TextGen model from "${originalModel}" to "${overrideModel}" (type: ${textgenType})`);

    return {
        apiType: 'textgen',
        source: textgenType,
        property: property,
        originalModel: originalModel,
    };
}

/**
 * Gets the current model for Text Generation APIs.
 *
 * @return {string} The current model name
 */
function getTextGenModel() {
    const textgenType = textgenerationwebui_settings.type;
    const property = TEXTGEN_MODEL_PROPERTY_MAP[textgenType];

    if (!property) {
        return '';
    }

    return textgenerationwebui_settings[property] || '';
}

/**
 * Resolves the effective model for a thinking step.
 * Checks per-prompt model override first, then global step model override.
 *
 * @param {?ThinkingPrompt} thinkingPrompt - The current thinking prompt (may have its own model_override)
 * @return {string} The model to use, or empty string if no override
 */
export function getStepModelOverride(thinkingPrompt) {
    // Per-prompt override takes priority
    if (thinkingPrompt && thinkingPrompt.model_override && thinkingPrompt.model_override.trim() !== '') {
        return thinkingPrompt.model_override.trim();
    }

    // Global step override
    if (settings.step_model_override && settings.step_model_override.trim() !== '') {
        return settings.step_model_override.trim();
    }

    return '';
}
