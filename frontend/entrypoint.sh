#!/bin/sh

# Replace privacy.md if PRIVACY_MD is set
if [ -n "$PRIVACY_MD" ]; then
    echo "Overwriting privacy.md with content from PRIVACY_MD"
    echo "$PRIVACY_MD" > /usr/share/nginx/html/privacy.md
fi

# Replace impressum.md if IMPRESSUM_MD is set
if [ -n "$IMPRESSUM_MD" ]; then
    echo "Overwriting impressum.md with content from IMPRESSUM_MD"
    echo "$IMPRESSUM_MD" > /usr/share/nginx/html/impressum.md
fi

exec "$@"
