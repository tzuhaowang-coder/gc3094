FROM busybox
ADD ./copy_volume.sh /copy_volume.sh
ADD ./build /tmp
ENTRYPOINT ["/copy_volume.sh"]