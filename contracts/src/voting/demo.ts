import {
  AccountUpdate,
  Field,
  MerkleMap,
  Mina,
  Poseidon,
  PrivateKey,
  PublicKey,
  Signature,
} from 'o1js';

import {
  CANDIDATES,
  Election,
  MerkleMapExtended,
  StateTransition,
  Vote,
  VoterData,
  calculateNullifierRootTransition,
  calculateVotes,
} from './vote_aggregator/lib.js';

import { Prover } from './vote_aggregator/prover.js';
import { getContractClass } from './contract.js';

console.log('Generating six random private keys..');
// Generate 6 random private keys
const privKeys = Array(6)
  .fill(0)
  .map(() => PrivateKey.random());

// Initialize the voter data tree to keep track of the eligible voters
const VoterDataTree = MerkleMapExtended<VoterData>();

// We had the eligible voters to the tree (from the previously generated private keys)
privKeys.forEach((priv) => {
  let vd = new VoterData({ publicKey: priv.toPublicKey() });
  VoterDataTree.set(Poseidon.hash(priv.toPublicKey().toFields()), vd);
  return vd;
});

console.log(
  `${privKeys.length} dummy voters added, root: `,
  VoterDataTree.getRoot().toString()
);

const NullifierTreeTemp = new MerkleMap();
const NullifierTreeProver = new MerkleMap();

console.log('Generating prover...');
const VoteProver = Prover(NullifierTreeProver, VoterDataTree);
console.log('Compiling prover...');
await VoteProver.compile();
console.log('Prover compiled!');

// Creating a new election
let election = new Election({
  title: 'The Cat',
  id: Field(123456), // this should be unique to prevent replay attacks
  candidates: Array(4)
    .fill(Field(0))
    .map((v) => Field(v)),
});

console.log('New election created!');
console.log(`Title: ${election.title}
  Id: ${election.id}`);

let voterDataRoot = VoterDataTree.getRoot();

// Generate a vote for each voter
console.log('Generating six votes..');
const votes = privKeys.map((priv, i) => {
  let v = new Vote({
    /**
     * By signing the candidate id and the election id
     * and verifying this within the proof we prevent the
     * aggregator from tampering with the vote.
     * However the aggregator could still simply ignore to count the vote.
     **/
    authorization: Signature.create(priv, [
      Field(i % 4), // Candidate ID
      election.id, // the election id, by signing it we prevent replay attacks
      voterDataRoot, // match the predefined voter data
    ]),
    candidateId: Field(i % 4),
    electionId: election.id,
    voter: priv.toPublicKey(),
    voterDataRoot: voterDataRoot,
  });
  return v;
});

/**
 * Generate the nullifier root at initial state when the election is freshly created
 * and no votes have been cast yet, along with the nullifier root after the first three votes
 * have been cast.
 * */
let { rootBefore, rootAfter } = calculateNullifierRootTransition(
  NullifierTreeTemp,
  votes.slice(0, 3)
);

// Calculate the count for each candidates from the first three votes
let votesAfter = calculateVotes(votes.slice(0, 3));

// This is our state transition data structure!
let st = new StateTransition({
  nullifier: {
    before: rootBefore,
    after: rootAfter,
  },
  // Specific for this election
  electionId: election.id,
  // This is where we aggregate the results
  result: {
    // This is the initial state, before any votes have been cast
    // so we start with all candidates having 0 votes
    before: {
      candidates: Array(4)
        .fill(Field(0))
        .map((v) => Field(v)),
    },
    after: {
      candidates: votesAfter,
    },
  },
  voterDataRoot: voterDataRoot,
});

console.log('Proving the 3 first votes..');
// We prove 3 votes!
let pi = await VoteProver.baseCase(st, votes.slice(0, 3));
// Verify the proof
pi.verify();
console.log('First round of the election valid!');
// Print the result
console.log(`Result for election #${election.id}, ${election.title}:\n`);

CANDIDATES.slice(0, 4).map((c, i) => {
  console.log(`${c}: ${pi.publicInput.result.after.candidates[i].toString()}`);
});

// Calculate the count for each candidates from the next three votes
let votesCount = calculateVotes(votes.slice(3, 6));

// Calculate the nullifier root after the next three votes
let { rootAfter: rootAfter2 } = calculateNullifierRootTransition(
  NullifierTreeTemp,
  votes.slice(3, 6)
);

let st2 = new StateTransition({
  nullifier: {
    // The starting state is the previously applied state
    // so we start with the nullifier root after the first three votes
    before: pi.publicInput.nullifier.after,
    after: rootAfter2,
  },
  // Specific for this election
  electionId: election.id,
  // This is where we aggregate the results
  result: {
    before: {
      // The starting state is the previously applied state
      // so we start with the result after the first three votes
      candidates: pi.publicInput.result.after.candidates,
    },
    after: {
      // We add the count of the next three votes to the previous state
      candidates: pi.publicInput.result.after.candidates.map((v, i) =>
        v.add(votesCount[i])
      ),
    },
  },
  voterDataRoot: voterDataRoot,
});

// We now prove the next three votes!
console.log('Proving next three votes...');
let pi2 = await VoteProver.next(st2, pi, votes.slice(3, 6));
// Verify the proof
pi2.verify();

// Print the result
console.log('Second batch of the election valid!');
console.log(`Result for election #${election.id}, ${election.title}:\n`);

CANDIDATES.slice(0, 4).map((c, i) => {
  console.log(`${c}: ${pi2.publicInput.result.after.candidates[i].toString()}`);
});

// We proceed with the deployment of the settlement contract
// so that we can verify the proofs on-chain and keep a record
// of the election directly on-chain
const SettlementContract = getContractClass(VoteProver);

let deployerAccount: PublicKey,
  deployerKey: PrivateKey,
  senderAccount: PublicKey,
  senderKey: PrivateKey,
  zkAppAddress: PublicKey,
  zkAppPrivateKey: PrivateKey,
  zkApp: any;

console.log('Compiling Settlement contract...');
await SettlementContract.compile();

// Start a local instance of the Mina blockchain
const Local = Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);
// Get the first two test accounts for deployment and signing
// subsequent transactions
({ privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0]);
({ privateKey: senderKey, publicKey: senderAccount } = Local.testAccounts[1]);
// Generate a random keypair for the settlement contract
zkAppPrivateKey = PrivateKey.random();
zkAppAddress = zkAppPrivateKey.toPublicKey();
zkApp = new SettlementContract(zkAppAddress);

console.log('Deploying Settlement contract...');
// Deploy the settlement contract and set the election details
const txn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkApp.deploy();
  zkApp.setElectionDetails(election.id, voterDataRoot, rootBefore);
});
await txn.prove();
// this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
await txn.sign([deployerKey, zkAppPrivateKey]).send();
console.log('Settlement contract deployed.');

console.log('Verifying first proof on-chain...');
// We now verify the first proof on-chain
// We have to do it proof by proof in order as the contract will need
// to verify that proof start from the correct state
const verifTx = await Mina.transaction(senderAccount, () => {
  zkApp.verifyVoteBatch(pi);
});
console.log('First proof verified.');

await verifTx.prove();
await verifTx.sign([senderKey]).send();

console.log('Verifying second proof on-chain...');
// We now verify the second proof on-chain
const verifTx2 = await Mina.transaction(senderAccount, () => {
  zkApp.verifyVoteBatch(pi2);
});

await verifTx2.prove();
await verifTx2.sign([senderKey]).send();
// We have now successfully verified the two proofs on-chain
// Our votes are now counted on-chain but each individual vote
// is kept private from the rest of the network!
console.log('Proofs all verified!');
