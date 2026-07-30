<?php
/**
 * Plugin Name: Dashboard ERP Core (WooCommerce + POS)
 * Plugin URI: https://renovatio.com/
 * Description: Backend Core API for custom React Dashboard. Handles Roles, Zapier-like mapping, and Production/Delivery status sync with WooCommerce.
 * Version: 1.0.0
 * Author: Renovatio
 * Text Domain: dashboard-erp-core
 * Requires at least: 5.8
 * Requires PHP: 7.4
 *
 * @package Dashboard_ERP_Core
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

define( 'DERP_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'DERP_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'DERP_VERSION', '1.0.0' );

// 1. Activation Hook to create custom database tables
register_activation_hook( __FILE__, 'derp_install_custom_tables' );

function derp_install_custom_tables() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();
    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

    // Table for Field Mapping (The "Zapier" logic)
    $table_mapping = $wpdb->prefix . 'derp_field_mapping';
    $sql_mapping = "CREATE TABLE $table_mapping (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        report_name varchar(255) NOT NULL,
        woo_endpoint varchar(255) NOT NULL,
        woo_field_key varchar(255) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY  (id)
    ) $charset_collate;";
    dbDelta( $sql_mapping );

    // Table for Production States
    $table_production = $wpdb->prefix . 'derp_production_orders';
    $sql_production = "CREATE TABLE $table_production (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        order_id bigint(20) NOT NULL,
        production_status varchar(50) NOT NULL, /* pending, in_progress, finished */
        assigned_to bigint(20), /* User ID */
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        UNIQUE KEY order_id (order_id)
    ) $charset_collate;";
    dbDelta( $sql_production );
}

// 2. Register REST API Endpoints
add_action( 'rest_api_init', 'derp_register_api_endpoints' );

function derp_register_api_endpoints() {
    $namespace = 'dashboard-erp/v1';

    // Route: Get summary dashboard data
    register_rest_route( $namespace, '/summary', array(
        'methods'             => 'GET',
        'callback'            => 'derp_api_get_summary',
        'permission_callback' => 'derp_api_check_permission'
    ) );

    // Route: Get POS Metadata (Cashiers and Registers Dictionary)
    register_rest_route( $namespace, '/pos-metadata', array(
        'methods'             => 'GET',
        'callback'            => 'derp_api_get_pos_metadata',
        'permission_callback' => '__return_true' // Allow dashboard to fetch dictionary
    ) );
}

function derp_api_check_permission( $request ) {
    // Basic check: Ensure user is logged in and has appropriate capability.
    // We will expand this with JWT or Application Passwords for the React app.
    return true; // Set to true for initial testing, change to `current_user_can('read')` later.
}

function derp_api_get_summary( $request ) {
    // Mock response for now. We will integrate with WC_Order_Query here.
    return new WP_REST_Response( array(
        'success' => true,
        'data' => array(
            'total_sales' => 24500,
            'orders_count' => 142,
            'net_profit' => 8200
        )
    ), 200 );
}

function derp_api_get_pos_metadata( $request ) {
    $cashiers = array();
    $registers = array();

    // Fetch all users to map Cashier IDs to Names
    $users = get_users( array( 'fields' => array( 'ID', 'display_name' ) ) );
    foreach ( $users as $user ) {
        $cashiers[ $user->ID ] = $user->display_name;
    }

    // Fetch all YITH POS Registers (Registers are custom post types: ypos_register)
    $register_posts = get_posts( array(
        'post_type'      => 'ypos_register',
        'posts_per_page' => -1,
        'post_status'    => 'publish'
    ) );

    // Fallback if the post type is slightly different in newer versions
    if ( empty( $register_posts ) ) {
        $register_posts = get_posts( array(
            'post_type'      => 'yith_pos_register',
            'posts_per_page' => -1,
            'post_status'    => 'publish'
        ) );
    }

    foreach ( $register_posts as $post ) {
        $registers[ $post->ID ] = $post->post_title;
    }

    return new WP_REST_Response( array(
        'success' => true,
        'cashiers' => $cashiers,
        'registers' => $registers
    ), 200 );
}
