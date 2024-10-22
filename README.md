[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

# Browser extension signing manager

Polymesh SDK signing manager that manages accounts and signs via a polkadot compatible browser wallet extension.

## Usage

```typescript
import { BrowserExtensionSigningManager } from '@polymeshassociation/browser-extension-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';

// setup. This call will prompt the user if they haven't authorized the dApp before
const signingManager = await BrowserExtensionSigningManager.create({
  appName: 'my-dApp',
  extensionName: 'polywallet', // this is optional, defaults to 'polywallet'
});

const polymesh = await Polymesh.connect({
  nodeUrl,
  signingManager,
});

// callback is called whenever the extension Accounts change
signingManager.onAccountChange(newAccounts => {
  // change SDK's signing account, reload the page, do whatever
});

// callback is called whenever the extension's selected network changes
signingManager.onNetworkChange(newNetwork => {
  // act accordingly
});
```
