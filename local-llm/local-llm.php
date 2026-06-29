<?php
/**
 * Plugin Name: Local LLM Sidebar
 */

function local_llm_enqueue_assets() {
    $asset_file = include(plugin_dir_path(__FILE__) . 'build/index.asset.php');

    wp_enqueue_script(
        'local-llm-sidebar-js',
        plugins_url('build/index.js', __FILE__),
        $asset_file['dependencies'],
        $asset_file['version']
    );
}
add_action('enqueue_block_editor_assets', 'local_llm_enqueue_assets');
