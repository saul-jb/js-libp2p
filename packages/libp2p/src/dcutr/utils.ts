import { type Multiaddr } from '@multiformats/multiaddr'
import { Circuit, IP, DNS } from '@multiformats/multiaddr-matcher'
import isPrivate from 'private-ip'
import type { TransportManager } from '@libp2p/interface-internal/src/transport-manager'

/**
 * Returns true if the passed multiaddr is public, not relayed and we have a
 * transport that can dial it
 */
export function isPublicAndDialable (ma: Multiaddr, transportManager: TransportManager): boolean {
  // ignore circuit relay
  if (Circuit.matches(ma)) {
    return false
  }

  const transport = transportManager.transportForMultiaddr(ma)

  if (transport == null) {
    return false
  }

  // dns addresses are probably public?
  if (DNS.matches(ma)) {
    return true
  }

  // ensure we have only IPv4/IPv6 addresses
  if (!IP.matches(ma)) {
    return false
  }

  return isPrivate(ma.toOptions().host) === false
}
