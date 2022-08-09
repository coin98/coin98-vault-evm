use solana_cli_config::{CONFIG_FILE, Config};
use solana_sdk::signature::{Keypair, read_keypair_file};
use std::io::Error;

pub fn get_default_wallet() -> Result<Keypair, Error> {
    let config_file = CONFIG_FILE.as_ref().ok_or_else(|| panic!("unable to get config file path")).unwrap();
    let config = Config::load(&config_file)?;
    
    let keypair = read_keypair_file(&config.keypair_path).unwrap();
    Ok(keypair)
}
