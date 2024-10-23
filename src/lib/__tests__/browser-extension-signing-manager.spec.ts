/* eslint-disable import/first */
const enableWeb3ExtensionMock = jest.fn();
const getExtensionsMock = jest.fn();

import { InjectedAccount } from '@polkadot/extension-inject/types';
import { PolkadotSigner } from '@polymeshassociation/signing-manager-types';

import { Extension, NetworkInfo } from '../../types';
import { changeAddressFormat, mapAccounts } from '../../utils';
import { BrowserExtensionSigningManager } from '../browser-extension-signing-manager';

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  enableWeb3Extension: enableWeb3ExtensionMock,
  getExtensions: getExtensionsMock,
}));

describe('BrowserExtensionSigningManager Class', () => {
  let signingManager: BrowserExtensionSigningManager;
  let networkAgnosticSigningManager: BrowserExtensionSigningManager;
  let args: { appName: string; extensionName?: string };
  const accountsGetStub = jest.fn();
  const accountsSubscribeStub = jest.fn();
  const networkSubscribeStub = jest.fn();
  const getNetworkStub = jest.fn();
  let extensionName: string;

  const accounts: InjectedAccount[] = [
    {
      name: 'ACCOUNT 1',
      address: '5Ef2XHepJvTUJLhhx39Nf5iqu6AACrfFAmc6AW8a3hKF4Rdc',
      genesisHash: 'someHash',
      type: 'ed25519',
    },
    {
      name: 'ACCOUNT 2',
      address: '5HQLVKFYkytr9HisQRWoUArUWw8YNWUmhLdXztRFjqysiNUx',
      genesisHash: 'someHash',
      type: 'sr25519',
    },
  ];

  beforeAll(() => {
    extensionName = 'polywallet';
    args = {
      appName: 'testDApp',
      extensionName,
    };
  });

  beforeEach(async () => {
    const extensionDetails = {
      accounts: {
        get: accountsGetStub,
        subscribe: accountsSubscribeStub,
      },
      version: '1.5.5',
      signer: 'signer' as unknown as PolkadotSigner,
    };
    enableWeb3ExtensionMock.mockResolvedValueOnce({
      name: 'randomName',
      ...extensionDetails,
    } as Extension);
    networkAgnosticSigningManager = await BrowserExtensionSigningManager.create({
      appName: 'testDApp',
      extensionName: 'randomName',
    });
    networkAgnosticSigningManager.setSs58Format(42);

    enableWeb3ExtensionMock.mockResolvedValue({
      name: extensionName,
      network: {
        subscribe: networkSubscribeStub,
        get: getNetworkStub,
      },
      ...extensionDetails,
    } as Extension);
    signingManager = await BrowserExtensionSigningManager.create(args);
    signingManager.setSs58Format(42);
  });

  describe('method: create', () => {
    it('should create instance of BrowserExtensionSigningManager', async () => {
      expect(enableWeb3ExtensionMock).toHaveBeenCalledWith(args.appName, args.extensionName);
      enableWeb3ExtensionMock.mockClear();

      await BrowserExtensionSigningManager.create({
        appName: 'someOtherApp',
        ss58Format: 42,
      });
      expect(enableWeb3ExtensionMock).toHaveBeenCalledTimes(1);
      expect(enableWeb3ExtensionMock).toHaveBeenCalledWith('someOtherApp', extensionName);
    });
  });

  describe('method: getAccounts', () => {
    it('should return all Accounts held in the extension, respecting the SS58 format', async () => {
      accountsGetStub.mockResolvedValue(accounts);

      let result = await signingManager.getAccounts();

      expect(result).toEqual(accounts.map(({ address }) => address));

      signingManager.setSs58Format(0);

      result = await signingManager.getAccounts();

      expect(result).toEqual(accounts.map(({ address }) => changeAddressFormat(address, 0)));
    });

    it("should throw an error if the Signing Manager doesn't have a SS58 format", async () => {
      signingManager = await BrowserExtensionSigningManager.create(args);

      expect(signingManager.getAccounts()).rejects.toThrow(
        "Cannot call 'getAccounts' before calling 'setSs58Format'. Did you forget to use this Signing Manager to connect with the Polymesh SDK?"
      );
    });

    it('should return accounts filtered by genesisHash and accountTypes', async () => {
      accountsGetStub.mockResolvedValue(accounts);

      networkAgnosticSigningManager.setGenesisHash('someHash');
      networkAgnosticSigningManager.setAccountTypes(['ed25519']);
      const result = await networkAgnosticSigningManager.getAccounts();
      expect(result.length).toEqual(1);
    });
  });

  describe('method: getAccountsWithMeta', () => {
    it('should return all Accounts along with its metadata held in the extension, respecting the SS58 format', async () => {
      accountsGetStub.mockResolvedValue(accounts);

      let result = await signingManager.getAccountsWithMeta();

      expect(result).toEqual(
        accounts.map(({ address, genesisHash, name, type }) => ({
          address,
          meta: { genesisHash, name, source: extensionName },
          type,
        }))
      );

      signingManager.setSs58Format(0);

      result = await signingManager.getAccountsWithMeta();

      expect(result).toEqual(
        accounts.map(({ address, genesisHash, name, type }) => ({
          address: changeAddressFormat(address, 0),
          meta: { genesisHash, name, source: extensionName },
          type,
        }))
      );
    });

    it("should throw an error if the Signing Manager doesn't have a SS58 format", async () => {
      signingManager = await BrowserExtensionSigningManager.create(args);

      expect(signingManager.getAccounts()).rejects.toThrow(
        "Cannot call 'getAccounts' before calling 'setSs58Format'. Did you forget to use this Signing Manager to connect with the Polymesh SDK?"
      );
    });
  });

  describe('method: getExternalSigner', () => {
    it('should return the signer injected by the extension', () => {
      const signer = signingManager.getExternalSigner();

      // this is the value returned by the web3Enable stub, set in `beforeEach`
      expect(signer).toBe('signer');
    });
  });

  describe('method: onAccountChange', () => {
    it('should pass the new Accounts to the callback, respecting the SS58 format', () => {
      accountsSubscribeStub.mockImplementation((cb) => {
        cb(accounts);
      });

      const callback = jest.fn();
      signingManager.onAccountChange(callback, false);

      expect(callback).toHaveBeenCalledWith(accounts.map(({ address }) => address));

      signingManager.setSs58Format(0);

      callback.mockReset();
      signingManager.onAccountChange(callback);

      expect(callback).toHaveBeenCalledWith(
        accounts.map(({ address }) => changeAddressFormat(address, 0))
      );

      signingManager.setSs58Format(42);

      callback.mockReset();
      signingManager.onAccountChange(callback, true);

      expect(callback).toHaveBeenCalledWith(mapAccounts(extensionName, accounts, 42));
    });

    it("should throw an error if the Signing Manager doesn't have a SS58 format", async () => {
      signingManager = await BrowserExtensionSigningManager.create(args);

      accountsSubscribeStub.mockImplementation((cb) => {
        cb(null, []);
      });

      expect(() => signingManager.onAccountChange(() => 1)).toThrow(
        "Cannot call 'onAccountChange callback' before calling 'setSs58Format'. Did you forget to use this Signing Manager to connect with the Polymesh SDK?"
      );
    });
  });

  describe('method: onNetworkChange', () => {
    it('should pass the new network to the callback', () => {
      const newNetwork = {
        name: 'testnet',
        label: 'Testnet',
        wssUrl: 'wss://testnet.url',
      };

      networkSubscribeStub.mockImplementation((cb) => {
        cb(newNetwork);
      });

      const callback = jest.fn();
      signingManager.onNetworkChange(callback);

      expect(callback).toHaveBeenCalledWith(newNetwork);
    });

    it('should do nothing for network agnostic extensions', () => {
      const callback = jest.fn();
      networkAgnosticSigningManager.onNetworkChange(callback);

      expect(callback).toHaveBeenCalledTimes(0);
    });
  });

  describe('method: getExtensionList', () => {
    it('should return the list of all available extensions', () => {
      getExtensionsMock.mockReturnValue({
        polywallet: {
          version: '5.4.1',
        },
        talisman: {
          version: '1.1.0',
        },
      });
      expect(BrowserExtensionSigningManager.getExtensionList()).toEqual([
        extensionName,
        'talisman',
      ]);
    });
  });

  describe('method: getCurrentNetwork', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log');
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    it('should return the current network to which the extension is connected', async () => {
      const networkInfo: NetworkInfo = {
        name: 'testnet',
        label: 'testnet',
        wssUrl: 'wss://testnet-rpc.polymesh.live',
      };
      getNetworkStub.mockResolvedValue(networkInfo);

      const result = await signingManager.getCurrentNetwork();
      expect(result).toEqual(networkInfo);
      expect(logSpy).toHaveBeenCalledTimes(0);
    });

    it('should return null for network agnostic extensions', async () => {
      const result = await networkAgnosticSigningManager.getCurrentNetwork();
      expect(result).toBeNull();
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith("The 'randomName' extension is network agnostic");
    });
  });
});
