module move_dex::faucet_coin {
    use sui::coin::{Self, TreasuryCap};
    use sui::url;

    public struct FAUCET_COIN has drop {}

    #[allow(lint(share_owned))]
    fun init(witness: FAUCET_COIN, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency<FAUCET_COIN>(
            witness,
            6,
            b"FC",
            b"Faucet Coin",
            b"A coin for testing the DEX",
            option::some(url::new_unsafe_from_bytes(b"https://sui.io")),
            ctx
        );

        transfer::public_freeze_object(metadata);
        transfer::public_share_object(treasury_cap);
    }

    public entry fun mint(
        treasury_cap: &mut TreasuryCap<FAUCET_COIN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        coin::mint_and_transfer(treasury_cap, amount, recipient, ctx);
    }
}
