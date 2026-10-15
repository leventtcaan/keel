package app.keel.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * The address a sign-in is counted under (K-817). It is the connection's own address as the container reports it: behind
 * Caddy, Tomcat replaces it with X-Forwarded-For only when the connection comes from the proxy network
 * (server.tomcat.remoteip, application.yml); this class never reads a header, so a client cannot choose its own key.
 */
class ClientAddressTests {

    private static MockHttpServletRequest from(String address) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(address);
        return request;
    }

    @Test
    void anIpv4AddressIsItself() {
        assertThat(ClientAddress.key(from("203.0.113.7"))).isEqualTo("203.0.113.7");
    }

    @Test
    void anIpv6HostSharesItsKeyWithTheRestOfItsSixtyFourBitNetwork() {
        // A household or a phone gets a whole /64: counting each address would let one client rotate around the limit.
        assertThat(ClientAddress.key(from("2001:db8:abcd:12:aaaa:bbbb:cccc:dddd")))
                .isEqualTo(ClientAddress.key(from("2001:db8:abcd:12::1")))
                .isNotEqualTo(ClientAddress.key(from("2001:db8:abcd:13::1")));
    }

    @Test
    void anIpv4MappedIpv6AddressIsTheIpv4Address() {
        assertThat(ClientAddress.key(from("::ffff:203.0.113.7"))).isEqualTo("203.0.113.7");
    }

    @Test
    void aForwardedHeaderTheContainerLeftAloneIsNotRead() {
        MockHttpServletRequest request = from("203.0.113.7");
        request.addHeader("X-Forwarded-For", "198.51.100.99");
        request.addHeader("X-Real-IP", "198.51.100.98");
        request.addHeader("Forwarded", "for=198.51.100.97");

        assertThat(ClientAddress.key(request)).isEqualTo("203.0.113.7");
    }

    @Test
    void everyWayOfWritingAnIpv6AddressIsReadTheSame() {
        assertThat(ClientAddress.key(from("::1"))).isEqualTo(ClientAddress.key(from("0:0:0:0:0:0:0:1")));
        assertThat(ClientAddress.key(from("2001:DB8::"))).isEqualTo(ClientAddress.key(from("2001:db8:0:0:0:0:0:0")));
        assertThat(ClientAddress.key(from("fe80::1%eth0"))).isEqualTo(ClientAddress.key(from("fe80::2")));
        assertThat(ClientAddress.key(from("2001:db8::1"))).isNotEqualTo(ClientAddress.key(from("2001:db9::1")));
        assertThat(ClientAddress.key(from("2001:db8::1"))).isNotEqualTo(ClientAddress.key(from("203.0.113.7")));
    }

    @Test
    void textThatLooksLikeAnAddressButIsNotIsUnknown() {
        for (String bad : new String[] {"999.1.1.1", "1.2.3", "1::2::3", "1:2:3:4:5:6:7:8:9", "1:2:3:4:5:6:7", "gggg::1", "2001:db8::12345"}) {
            assertThat(ClientAddress.key(from(bad))).as(bad).isEqualTo(ClientAddress.UNKNOWN);
        }
    }

    @Test
    void somethingThatIsNotAnAddressSharesOneKeyAndNeverLooksAnythingUp() {
        assertThat(ClientAddress.key(from("not-an-address.example"))).isEqualTo(ClientAddress.UNKNOWN);
        assertThat(ClientAddress.key(from(""))).isEqualTo(ClientAddress.UNKNOWN);
        assertThat(ClientAddress.key(from(null))).isEqualTo(ClientAddress.UNKNOWN);
    }
}
