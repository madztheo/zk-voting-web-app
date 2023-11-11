import { Vote } from './Vote';
import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  UInt32,
} from 'o1js';

let proofsEnabled = false;

describe('Vote', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Vote;

  beforeAll(async () => {
    if (proofsEnabled) await Vote.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Vote(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Vote` smart contract', async () => {
    await localDeploy();
    const ballot = zkApp.ballot.get();
    expect(ballot.candidates).toEqual([
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
    ]);
  });

  it('correctly updates the ballot state on the `Vote` smart contract', async () => {
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.cast(UInt32.from(2));
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const updatedBallot = zkApp.ballot.get();
    expect(updatedBallot.candidates).toEqual([
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(1),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
    ]);
  });

  it('should correctly reset the election', async () => {
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.cast(UInt32.from(2));
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const txn2 = await Mina.transaction(senderAccount, () => {
      zkApp.cast(UInt32.from(5));
    });
    await txn2.prove();
    await txn2.sign([senderKey]).send();

    const txn3 = await Mina.transaction(senderAccount, () => {
      zkApp.cast(UInt32.from(2));
    });
    await txn3.prove();
    await txn3.sign([senderKey]).send();

    const updatedBallot = zkApp.ballot.get();
    expect(updatedBallot.candidates).toEqual([
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(2),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(1),
      UInt32.from(0),
      UInt32.from(0),
    ]);

    // reset transaction
    const resetTxn = await Mina.transaction(senderAccount, () => {
      zkApp.resetElection();
    });
    await resetTxn.prove();
    await resetTxn.sign([senderKey]).send();

    const resetBallot = zkApp.ballot.get();
    expect(resetBallot.candidates).toEqual([
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
      UInt32.from(0),
    ]);
  });
});
