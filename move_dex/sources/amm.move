module move_dex::amm {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// Error codes
    const EInvalidLiquidity: u64 = 0;
    const EInsufficientAmount: u64 = 1;
    const EInsufficientLiquidity: u64 = 2;
    const EEmptyPool: u64 = 3;
    const EZeroReserve: u64 = 4;

    /// The Pool object representing a liquidity pool for two coins.
    public struct Pool<phantom T0, phantom T1> has key {
        id: UID,
        coin_a: Balance<T0>,
        coin_b: Balance<T1>,
        lp_supply: u64, // Total LP units issued
    }

    /// LP Token representing shares in the pool
    public struct LP<phantom T0, phantom T1> has key, store {
        id: UID,
        value: u64,
    }

    /// Create a new pool
    public entry fun create_pool<T0, T1>(
        coin_a: Coin<T0>,
        coin_b: Coin<T1>,
        ctx: &mut TxContext
    ) {
        let amt_a = coin::value(&coin_a);
        let amt_b = coin::value(&coin_b);
        assert!(amt_a > 0 && amt_b > 0, EInvalidLiquidity);

        // Initial LP units = sqrt(amt_a * amt_b) - simplified for now
        // For simplicity, we just use avg
        let initial_lp = (amt_a + amt_b) / 2;

        let pool = Pool {
            id: object::new(ctx),
            coin_a: coin::into_balance(coin_a),
            coin_b: coin::into_balance(coin_b),
            lp_supply: initial_lp,
        };

        let lp_token = LP<T0, T1> {
            id: object::new(ctx),
            value: initial_lp,
        };

        transfer::share_object(pool);
        transfer::public_transfer(lp_token, tx_context::sender(ctx));
    }

    /// Add liquidity to an existing pool
    public entry fun add_liquidity<T0, T1>(
        pool: &mut Pool<T0, T1>,
        coin_a: Coin<T0>,
        coin_b: Coin<T1>,
        ctx: &mut TxContext
    ) {
        let amt_a = coin::value(&coin_a);
        let amt_b = coin::value(&coin_b);
        assert!(amt_a > 0 && amt_b > 0, EInvalidLiquidity);

        let reserve_a = balance::value(&pool.coin_a);
        let reserve_b = balance::value(&pool.coin_b);
        let total_lp = pool.lp_supply;

        // lp_to_mint = min(amt_a / reserve_a, amt_b / reserve_b) * total_lp
        let lp_to_mint = if (amt_a * reserve_b < amt_b * reserve_a) {
            (amt_a * total_lp) / reserve_a
        } else {
            (amt_b * total_lp) / reserve_b
        };

        assert!(lp_to_mint > 0, EInvalidLiquidity);

        balance::join(&mut pool.coin_a, coin::into_balance(coin_a));
        balance::join(&mut pool.coin_b, coin::into_balance(coin_b));
        pool.lp_supply = total_lp + lp_to_mint;

        let lp_token = LP<T0, T1> {
            id: object::new(ctx),
            value: lp_to_mint,
        };

        transfer::public_transfer(lp_token, tx_context::sender(ctx));
    }

    /// Remove liquidity from a pool
    public entry fun remove_liquidity<T0, T1>(
        pool: &mut Pool<T0, T1>,
        lp_token: LP<T0, T1>,
        ctx: &mut TxContext
    ) {
        let lp_val = lp_token.value;
        assert!(lp_val > 0, EInvalidLiquidity);

        let reserve_a = balance::value(&pool.coin_a);
        let reserve_b = balance::value(&pool.coin_b);
        let total_lp = pool.lp_supply;

        let amt_a_out = (lp_val * reserve_a) / total_lp;
        let amt_b_out = (lp_val * reserve_b) / total_lp;

        pool.lp_supply = total_lp - lp_val;

        let coin_a_out = coin::from_balance(balance::split(&mut pool.coin_a, amt_a_out), ctx);
        let coin_b_out = coin::from_balance(balance::split(&mut pool.coin_b, amt_b_out), ctx);

        let LP { id, value: _ } = lp_token;
        object::delete(id);

        let sender = tx_context::sender(ctx);
        transfer::public_transfer(coin_a_out, sender);
        transfer::public_transfer(coin_b_out, sender);
    }

    /// Swap T0 for T1
    public entry fun swap_a_to_b<T0, T1>(
        pool: &mut Pool<T0, T1>,
        coin_a: Coin<T0>,
        ctx: &mut TxContext
    ) {
        let amt_a_in = coin::value(&coin_a);
        assert!(amt_a_in > 0, EInsufficientAmount);

        let reserve_a = balance::value(&pool.coin_a);
        let reserve_b = balance::value(&pool.coin_b);
        
        // Validate pool has liquidity
        assert!(reserve_a > 0, EZeroReserve);
        assert!(reserve_b > 0, EEmptyPool);

        // Constant Product Formula: (x + dx)(y - dy) = xy
        // dy = y * dx / (x + dx)
        let amt_b_out = (reserve_b * amt_a_in) / (reserve_a + amt_a_in);
        assert!(amt_b_out > 0, EInsufficientLiquidity);

        balance::join(&mut pool.coin_a, coin::into_balance(coin_a));
        let coin_b_out = coin::from_balance(balance::split(&mut pool.coin_b, amt_b_out), ctx);
        
        transfer::public_transfer(coin_b_out, tx_context::sender(ctx));
    }

    /// Swap T1 for T0
    public entry fun swap_b_to_a<T0, T1>(
        pool: &mut Pool<T0, T1>,
        coin_b: Coin<T1>,
        ctx: &mut TxContext
    ) {
        let amt_b_in = coin::value(&coin_b);
        assert!(amt_b_in > 0, EInsufficientAmount);

        let reserve_a = balance::value(&pool.coin_a);
        let reserve_b = balance::value(&pool.coin_b);
        
        // Validate pool has liquidity
        assert!(reserve_a > 0, EEmptyPool);
        assert!(reserve_b > 0, EZeroReserve);

        let amt_a_out = (reserve_a * amt_b_in) / (reserve_b + amt_b_in);
        assert!(amt_a_out > 0, EInsufficientLiquidity);

        balance::join(&mut pool.coin_b, coin::into_balance(coin_b));
        let coin_a_out = coin::from_balance(balance::split(&mut pool.coin_a, amt_a_out), ctx);
        
        transfer::public_transfer(coin_a_out, tx_context::sender(ctx));
    }

    #[test_only]
    use sui::test_scenario;
    #[test_only]
    use sui::sui::SUI;

    #[test_only]
    public struct CUSTOM_TOKEN has drop {}

    #[test]
    fun test_amm_flow() {
        let admin = @0xAD;
        let user = @0xDE;

        let mut scenario = test_scenario::begin(admin);
        
        // 1. Create Pool
        test_scenario::next_tx(&mut scenario, admin);
        {
            let coin_a = coin::mint_for_testing<SUI>(1000, test_scenario::ctx(&mut scenario));
            let coin_b = coin::mint_for_testing<CUSTOM_TOKEN>(1000, test_scenario::ctx(&mut scenario));
            create_pool(coin_a, coin_b, test_scenario::ctx(&mut scenario));
        };

        // 2. Swap A to B
        test_scenario::next_tx(&mut scenario, user);
        {
            let mut pool = test_scenario::take_shared<Pool<SUI, CUSTOM_TOKEN>>(&scenario);
            let coin_a_in = coin::mint_for_testing<SUI>(100, test_scenario::ctx(&mut scenario));
            
            swap_a_to_b(&mut pool, coin_a_in, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
        };

        // 3. Verify balance
        test_scenario::next_tx(&mut scenario, user);
        {
            let coin_b_out = test_scenario::take_from_sender<Coin<CUSTOM_TOKEN>>(&scenario);
            // Reserve A: 1000 -> 1100
            // Reserve B: 1000 -> 1000 - (1000 * 100) / (1000 + 100) = 1000 - 90 = 910
            // B out should be around 90
            assert!(coin::value(&coin_b_out) == 90, 0);
            test_scenario::return_to_sender(&scenario, coin_b_out);
        };

        test_scenario::end(scenario);
    }
}
