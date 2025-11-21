module model_bundle::model_bundle {
    use std::string::{Self, String};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::vector;

    /// Resource đại diện cho một model bundle
    public struct Bundle has key, store {
        id: UID,
        name: String,
        owner: address,
        blob: String,        // chỉ lưu blobId mới nhất
        created_at: u64,
        updated_at: u64,
    }

    /// Event khi tạo bundle mới
    public struct BundleCreated has copy, drop {
        bundle_id: address,
        name: String,
        owner: address,
        blob: String,
    }

    /// Event khi update blob mới
    public struct BlobUpdated has copy, drop {
        bundle_id: address,
        old_blob: String,
        new_blob: String,
    }

    /// Tạo bundle mới
    public entry fun create_bundle(
        name: String,
        blob: String,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let uid = object::new(ctx);
        let bundle_id = object::uid_to_address(&uid);

        let bundle = Bundle {
            id: uid,
            name,
            owner: sender,
            blob,
            created_at: tx_context::epoch(ctx),
            updated_at: tx_context::epoch(ctx),
        };

        event::emit(BundleCreated {
            bundle_id,
            name: bundle.name,
            owner: sender,
            blob: bundle.blob,
        });

        // Share object để ai cũng query được
        transfer::share_object(bundle);
    }

    /// Update blobId mới → ghi đè blob cũ
    public entry fun update_blob(
        bundle: &mut Bundle,
        new_blob: String,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);

        // chỉ owner mới có quyền update
        assert!(bundle.owner == sender, 1);

        let old_blob = bundle.blob;
        bundle.blob = new_blob;
        bundle.updated_at = tx_context::epoch(ctx);

        event::emit(BlobUpdated {
            bundle_id: object::uid_to_address(&bundle.id),
            old_blob,
            new_blob: bundle.blob,
        });
    }

    // ========== View Functions ==========

    /// Lấy blobId mới nhất
    public fun get_latest_blob(bundle: &Bundle): &String {
        &bundle.blob
    }

    /// Lấy name
    public fun get_name(bundle: &Bundle): &String {
        &bundle.name
    }

    /// Lấy owner
    public fun get_owner(bundle: &Bundle): address {
        bundle.owner
    }

    /// Lấy thông tin bundle
    public fun get_info(bundle: &Bundle): (String, address, String, u64, u64) {
        (bundle.name, bundle.owner, bundle.blob, bundle.created_at, bundle.updated_at)
    }
}
