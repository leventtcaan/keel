package app.keel.shared.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Who a route anyone can call counts its requests under (K-817): the connection's own address, {@code getRemoteAddr()}.
 * Behind Caddy that is the client's, because Caddy overwrites X-Forwarded-For with the address it saw (reverse_proxy
 * ignores what a client sends unless trusted_proxies is set, which deploy/Caddyfile does not) and Tomcat, with
 * server.forward-headers-strategy native, swaps the connection's address for that header only when the connection comes
 * from the Docker networks (server.tomcat.remoteip.internal-proxies). No header is read here: one a client could choose
 * would let it choose its own count.
 *
 * <p>An IPv6 client is counted by its /64, which a household or a phone is given whole: a single address would let a
 * client rotate around the limit for free. The text is read here by hand, not with java.net.InetAddress: the architecture
 * rule keeps every class that can reach the network inside privacy (EgressRuleTests), and a text that is not an address
 * must never be looked up anyway.
 */
final class ClientAddress {

    /** What something that is not an address is counted under: all of them together. */
    static final String UNKNOWN = "unknown";

    private static final String OCTET = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
    private static final Pattern IPV4 = Pattern.compile("^" + OCTET + "(\\." + OCTET + "){3}$");
    private static final Pattern IPV4_MAPPED = Pattern.compile("^(?i)::ffff:(" + OCTET + "(\\." + OCTET + "){3})$");
    private static final Pattern GROUP = Pattern.compile("^[0-9a-fA-F]{1,4}$");

    private ClientAddress() {
    }

    static String key(HttpServletRequest request) {
        String address = request.getRemoteAddr();
        if (address == null || address.isBlank()) {
            return UNKNOWN;
        }
        if (IPV4.matcher(address).matches()) {
            return address;
        }
        var mapped = IPV4_MAPPED.matcher(address);
        if (mapped.matches()) {
            return mapped.group(1);
        }
        return network(address);
    }

    /** The first four groups of an IPv6 address, written out in full; UNKNOWN if the text is not one. */
    private static String network(String address) {
        int zone = address.indexOf('%');
        String text = zone < 0 ? address : address.substring(0, zone);
        String[] halves = text.split("::", -1);
        if (halves.length > 2) {
            return UNKNOWN;
        }
        List<String> head = groups(halves[0]);
        List<String> tail = halves.length == 2 ? groups(halves[1]) : List.of();
        if (head == null || tail == null || (halves.length == 1 ? head.size() != 8 : head.size() + tail.size() > 7)) {
            return UNKNOWN;
        }
        List<String> all = new ArrayList<>(head);
        for (int missing = 8 - head.size() - tail.size(); halves.length == 2 && missing > 0; missing--) {
            all.add("0");
        }
        all.addAll(tail);
        StringBuilder key = new StringBuilder();
        for (String group : all.subList(0, 4)) {
            key.append(String.format("%4s", group.toLowerCase()).replace(' ', '0')).append(':');
        }
        return key.append(":/64").toString();
    }

    private static List<String> groups(String part) {
        if (part.isEmpty()) {
            return List.of();
        }
        List<String> groups = List.of(part.split(":", -1));
        return groups.stream().allMatch(group -> GROUP.matcher(group).matches()) ? groups : null;
    }
}
