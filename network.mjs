import os from 'node:os';
export function networkOrigins(port,interfaces=os.networkInterfaces()){
 return Object.entries(interfaces)
  .filter(([name])=>!/(?:vethernet|hyper-v|wsl|virtual|vmware|virtualbox|loopback|docker|tailscale|zerotier|tunnel)/i.test(name))
  .sort(([a],[b])=>Number(!/wi-?fi|wireless|무선/i.test(a))-Number(!/wi-?fi|wireless|무선/i.test(b)))
  .flatMap(([,addresses])=>(addresses||[]).filter(x=>x.family==='IPv4'&&!x.internal&&!x.address.startsWith('169.254.')).map(x=>`http://${x.address}:${port}`));
}
