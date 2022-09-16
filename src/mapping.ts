import { SpecCreated, Transfer as BadgeTransfer } from '../generated/Badges/Badges';
import { Transfer as RaftTransfer, Raft as RaftContract } from '../generated/Raft/Raft';
import { BadgeSpec, Raft } from '../generated/schema';
import { log, json } from '@graphprotocol/graph-ts';
import { ipfs } from '@graphprotocol/graph-ts';
import { getCIDFromIPFSUri, getBadgeID, getRaftID, appendMetadataPath } from './utils/helper';
import { handleBadgeMinted, handleBadgeBurned } from './badges';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function handleRaftTransfer(event: RaftTransfer): void {
  const to = event.params.to;
  const tokenId = event.params.tokenId;
  const raftID = getRaftID(tokenId, event.address);
  const timestamp = event.block.timestamp;

  let raft = Raft.load(raftID);
  if (raft !== null) {
    // Raft was transferred to a new owner
    raft.owner = to;
  } else {
    raft = new Raft(raftID);
    raft.owner = to;
    raft.tokenId = tokenId;
    raft.totalBadgesCount = 0;
    raft.totalSpecsCount = 0;
    raft.createdAt = timestamp;
    raft.createdBy = event.params.from.toHexString();

    const raftContract = RaftContract.bind(event.address);
    raft.uri = raftContract.tokenURI(tokenId);

    const cid = getCIDFromIPFSUri(raft.uri);
    const metadataBytes = ipfs.cat(cid);
    if (metadataBytes) {
      const result = json.try_fromBytes(metadataBytes);
      if (result.isOk) {
        const name = result.value.toObject().get('name');
        raft.name = name !== null ? name.toString() : '';

        const description = result.value.toObject().get('description');
        raft.description = description !== null ? description.toString() : '';
      } else {
        log.error('handleRaftTransfer: error fetching metadata for {}', [cid]);
      }
    } else {
      log.error('handleRaftTransfer: Invalid IPFS for cid {} for raftID {}', [cid, raftID]);
    }
  }
  raft.save();
}

export function handleSpecCreated(event: SpecCreated): void {
  const cid = getCIDFromIPFSUri(event.params.specUri);
  const uri = appendMetadataPath(event.params.specUri);
  const raftAddress = event.params.raftAddress;
  const raftTokenId = event.params.raftTokenId;
  const raftID = getRaftID(raftTokenId, raftAddress);
  const timestamp = event.block.timestamp;

  let spec = new BadgeSpec(cid);
  spec.uri = uri;
  spec.raft = raftID;
  spec.createdAt = timestamp;
  spec.totalBadgesCount = 0;

  const cidPath = appendMetadataPath(cid);
  const metadataBytes = ipfs.cat(cidPath);
  if (metadataBytes) {
    const result = json.try_fromBytes(metadataBytes);
    if (result.isOk) {
      const name = result.value.toObject().get('name');
      spec.name = name !== null ? name.toString() : '';

      const description = result.value.toObject().get('description');
      spec.description = description !== null ? description.toString() : '';

      const image = result.value.toObject().get('image');
      spec.image = image !== null ? image.toString() : '';

      const expiresAtTimestamp = result.value.toObject().get('expiresAt');
      spec.expiresAt = expiresAtTimestamp !== null ? expiresAtTimestamp.toBigInt() : null;
    } else {
      log.error('handleSpecCreated: error fetching metadata for {}', [cid]);
    }
  } else {
    log.error('handleSpecCreated: Invalid cid {} for {}', [cid, uri]);
  }
  spec.save();

  const raft = Raft.load(raftID);
  if (raft !== null) {
    raft.totalSpecsCount += 1;
    raft.save();
  } else {
    log.error('handleSpecCreated: Raft {} not found. Raft entity was not updated', [raftID]);
  }
}

export function handleBadgeTransfer(event: BadgeTransfer): void {
  const from = event.params.from.toHexString();
  const tokenId = event.params.tokenId;
  const badgeAddress = event.address;
  const badgeId = getBadgeID(tokenId, badgeAddress);
  if (from == ZERO_ADDRESS) {
    handleBadgeMinted(badgeId, event);
  } else {
    handleBadgeBurned(badgeId, event);
  }
}
